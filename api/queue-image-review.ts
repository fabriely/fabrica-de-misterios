import { randomUUID } from "node:crypto";
import { handleCallback, send } from "@vercel/queue";
import { put } from "@vercel/blob";
import { caseBundleSchema, caseIdSchema, generatedPublicCaseSchema, privateSolutionSchema, publicCaseSchema } from "@fabrica/contracts";
import { OpenAiVisualJudge, reviewPassed, visualReviewSchema } from "../apps/api/src/image/visual-judge.js";
import { SvgImageGenerator } from "../apps/api/src/image/svg-image-generator.js";
import { db } from "./_shared/db.js";
import { generationConfig } from "./_shared/generation.js";
import { measured } from "../apps/api/src/ai/monitoring.js";
import { recordOperation } from "./_shared/observability.js";
import { scheduleQualityReview } from "./_shared/quality-dispatch.js";

export const POST = handleCallback(async (message: unknown) => {
  const caseId = caseIdSchema.parse((message as { caseId?: unknown }).caseId);
  const sql = db();
  const claimId = randomUUID();
  const claimed = await sql`UPDATE cases SET image_review_state = 'reviewing', image_review_claim_id = ${claimId},
    image_review_claimed_at = NOW(), updated_at = NOW()
    WHERE id = ${caseId} AND status = 'generating_image'
      AND (image_review_state = 'awaiting_review'
        OR (image_review_state = 'reviewing' AND image_review_claimed_at < NOW() - INTERVAL '2 minutes'))
    RETURNING draft_public_case_json, private_solution_json, image_prompt, created_at,
      candidate_scene_url, candidate_portraits_url, image_retry_count`;
  const row = claimed[0];
  if (!row) {
    const current = await sql`SELECT status, image_review_state FROM cases WHERE id = ${caseId}`;
    if (!current[0] || ["ready", "failed"].includes(String(current[0].status))) return;
    if (current[0].image_review_state === "retry_pending") {
      await send("case-image", { caseId });
      return;
    }
    throw new Error("A revisão visual ainda está sendo executada por outra instância.");
  }

  const draft = generatedPublicCaseSchema.parse(row.draft_public_case_json);
  const solution = privateSolutionSchema.parse(row.private_solution_json);
  const sceneUrl = String(row.candidate_scene_url);
  const portraitsUrl = String(row.candidate_portraits_url);
  const imagePrompt = String(row.image_prompt);
  const createdAt = new Date(row.created_at as string).toISOString();
  const attempt = Number(row.image_retry_count) + 1;

  let result: Awaited<ReturnType<OpenAiVisualJudge["review"]>>;
  try {
    const config = generationConfig();
    const judge = new OpenAiVisualJudge({
      apiKey: config.openai.api_key,
      model: process.env.OPENAI_VISUAL_JUDGE_MODEL ?? "gpt-6.1-terra",
      timeoutSeconds: 42,
    });
    result = await measured(recordOperation, "visual_review", { caseId },
      () => judge.review({ imageUrl: sceneUrl, draft, imagePrompt }),
      (value) => ({ provider: "openai", model: value?.model ?? process.env.OPENAI_VISUAL_JUDGE_MODEL ?? "gpt-6.1-terra", usage: value?.usage }));
  } catch (cause) {
    console.error("[visual-review] Falha na revisão:", cause instanceof Error ? cause.name : "UnknownError");
    await publishFallback(JSON.stringify([{ attempt, error: "judge_unavailable" }]));
    return;
  }

  const review = visualReviewSchema.parse(result.review);
  const record = JSON.stringify([{ attempt, ...result }]);

  if (reviewPassed(review)) {
    const publicCase = publicCaseSchema.parse({
      ...draft, id: caseId, createdAt,
      portraitSheetUrl: portraitsUrl, scene: { ...draft.scene, imageUrl: sceneUrl },
    });
    caseBundleSchema.parse({ publicCase, privateSolution: solution });
    const completed = await sql`UPDATE cases SET status = 'ready', progress = 100, public_case_json = ${JSON.stringify(publicCase)}::jsonb,
      image_review_state = 'passed', image_review_json = image_review_json || ${record}::jsonb,
      image_review_claim_id = NULL, error_message = NULL, updated_at = NOW()
      WHERE id = ${caseId} AND status = 'generating_image' AND image_review_claim_id = ${claimId} RETURNING id`;
    if (completed[0]) await scheduleQualityReview(caseId);
    return;
  }

  if (attempt === 1) {
    const feedback = review.issues.filter((issue) => issue.severity === "major")
      .map((issue) => issue.explanation).concat(review.repairInstructions).filter(Boolean).join("; ").slice(0, 1_000);
    const updated = await sql`UPDATE cases SET image_review_state = 'retry_pending', image_retry_count = 1,
      image_review_feedback = ${feedback}, image_review_json = image_review_json || ${record}::jsonb,
      image_review_claim_id = NULL, image_review_claimed_at = NULL, image_claimed_at = NULL,
      progress = 85, updated_at = NOW()
      WHERE id = ${caseId} AND status = 'generating_image' AND image_review_claim_id = ${claimId} RETURNING id`;
    if (updated[0]) await send("case-image", { caseId });
    return;
  }

  await publishFallback(record);

  async function publishFallback(record: string) {
    try {
      const fallback = await new SvgImageGenerator("fallback").generate({
        caseId, prompt: imagePrompt, altText: draft.scene.imageAlt,
      });
      const blob = await put(`cases/${caseId}/scene-fallback-${randomUUID()}.svg`, Buffer.from(fallback.bytes), {
        access: "public", contentType: fallback.mediaType,
      });
      const publicCase = publicCaseSchema.parse({
        ...draft, id: caseId, createdAt,
        portraitSheetUrl: portraitsUrl, scene: { ...draft.scene, imageUrl: blob.url },
      });
      caseBundleSchema.parse({ publicCase, privateSolution: solution });
      const completed = await sql`UPDATE cases SET status = 'ready', progress = 100, public_case_json = ${JSON.stringify(publicCase)}::jsonb,
        image_review_state = 'fallback', image_review_json = image_review_json || ${record}::jsonb,
        image_review_claim_id = NULL, error_message = NULL, updated_at = NOW()
        WHERE id = ${caseId} AND status = 'generating_image' AND image_review_claim_id = ${claimId} RETURNING id`;
      if (completed[0]) await scheduleQualityReview(caseId);
    } catch (cause) {
      console.error("[visual-review] Falha na imagem reserva:", cause instanceof Error ? cause.name : "UnknownError");
      await sql`UPDATE cases SET status = 'failed', error_message = 'Não foi possível concluir a revisão visual.',
        image_review_claim_id = NULL, updated_at = NOW()
        WHERE id = ${caseId} AND status = 'generating_image' AND image_review_claim_id = ${claimId}`;
    }
  }
});
