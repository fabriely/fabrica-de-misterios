import { randomUUID } from "node:crypto";
import { handleCallback, send } from "@vercel/queue";
import { put } from "@vercel/blob";
import { caseBundleSchema, caseIdSchema, generatedPublicCaseSchema, privateSolutionSchema, publicCaseSchema } from "@fabrica/contracts";
import { db } from "./_shared/db.js";
import { generateImage, generatePortraitSheet } from "./_shared/generation.js";
import { measured } from "../apps/api/src/ai/monitoring.js";
import { recordOperation } from "./_shared/observability.js";
import { scheduleQualityReview } from "./_shared/quality-dispatch.js";

export const POST = handleCallback(async (message: unknown) => {
  const caseId = caseIdSchema.parse((message as { caseId?: unknown }).caseId);
  const sql = db();
  const claimId = randomUUID();
  const claimed = await sql`UPDATE cases SET image_claimed_at = NOW(), image_claim_id = ${claimId},
    image_review_state = 'generating',
    progress = CASE WHEN image_retry_count > 0 THEN 85 ELSE 75 END, updated_at = NOW()
    WHERE id = ${caseId} AND status = 'generating_image'
      AND (image_review_state IN ('pending', 'retry_pending')
        OR (image_review_state = 'generating' AND image_claimed_at < NOW() - INTERVAL '2 minutes'))
    RETURNING draft_public_case_json, private_solution_json, image_prompt, created_at,
      candidate_portraits_url, image_review_feedback`;
  const row = claimed[0];
  if (!row) {
    const current = await sql`SELECT status, image_review_state FROM cases WHERE id = ${caseId}`;
    if (!current[0] || ["ready", "failed"].includes(String(current[0].status))) return;
    if (current[0].image_review_state === "awaiting_review") {
      await send("case-image-review", { caseId });
      return;
    }
    throw new Error("Imagem ainda está sendo gerada por outra execução.");
  }
  try {
    const draft = generatedPublicCaseSchema.parse(row.draft_public_case_json);
    const solution = privateSolutionSchema.parse(row.private_solution_json);
    const retryFeedback = typeof row.image_review_feedback === "string" ? row.image_review_feedback : "";
    const imagePrompt = retryFeedback
      ? `${String(row.image_prompt)}\n\nNOVA TENTATIVA — corrija estes defeitos visuais, mantendo cenário e pistas: ${retryFeedback}`
      : String(row.image_prompt);
    const [sceneImage, portraitsImage] = await Promise.all([
      measured(recordOperation, "scene_image", { caseId },
        () => generateImage(caseId, imagePrompt, draft.scene.imageAlt),
        (value) => ({
          provider: value?.metadata.provider ?? "openai",
          model: value?.metadata.model ?? "unknown",
          usage: value?.metadata.usage,
          isFallback: value?.metadata.provider === "fallback",
        })),
      row.candidate_portraits_url ? Promise.resolve(null) : measured(recordOperation, "portraits_image", { caseId },
        () => generatePortraitSheet(caseId, draft.briefing, draft.suspects),
        (value) => ({
          provider: value?.metadata.provider ?? "openai",
          model: value?.metadata.model ?? "unknown",
          usage: value?.metadata.usage,
          isFallback: value?.metadata.provider === "fallback",
        })),
    ]);
    const [sceneBlob, portraitsBlob] = await Promise.all([
      put(`cases/${caseId}/scene-${randomUUID()}.${sceneImage.extension}`, Buffer.from(sceneImage.bytes), {
        access: "public", contentType: sceneImage.mediaType,
      }),
      portraitsImage ? put(`cases/${caseId}/portraits-${randomUUID()}.${portraitsImage.extension}`, Buffer.from(portraitsImage.bytes), {
        access: "public", contentType: portraitsImage.mediaType,
      }) : Promise.resolve(null),
    ]);
    const portraitsUrl = portraitsBlob?.url ?? String(row.candidate_portraits_url);
    if (sceneImage.metadata.provider === "fallback") {
      const publicCase = publicCaseSchema.parse({
        ...draft, id: caseId, createdAt: new Date(row.created_at as string).toISOString(),
        portraitSheetUrl: portraitsUrl, scene: { ...draft.scene, imageUrl: sceneBlob.url },
      });
      caseBundleSchema.parse({ publicCase, privateSolution: solution });
      const completed = await sql`UPDATE cases SET status = 'ready', progress = 100, public_case_json = ${JSON.stringify(publicCase)}::jsonb,
        image_review_state = 'fallback', candidate_scene_url = ${sceneBlob.url}, candidate_portraits_url = ${portraitsUrl},
        image_claim_id = NULL, error_message = NULL, updated_at = NOW()
        WHERE id = ${caseId} AND status = 'generating_image' AND image_claim_id = ${claimId} RETURNING id`;
      if (completed[0]) await scheduleQualityReview(caseId);
      return;
    }
    const updated = await sql`UPDATE cases SET progress = 85, image_review_state = 'awaiting_review',
      candidate_scene_url = ${sceneBlob.url}, candidate_portraits_url = ${portraitsUrl},
      image_claim_id = NULL, image_claimed_at = NULL, updated_at = NOW()
      WHERE id = ${caseId} AND status = 'generating_image' AND image_claim_id = ${claimId} RETURNING id`;
    if (!updated[0]) return;
  } catch (cause) {
      console.error("[generation] Imagem falhou:", cause);
      await sql`UPDATE cases SET status = 'failed', error_message = 'Não foi possível preparar a imagem do caso.',
        image_claim_id = NULL, updated_at = NOW()
      WHERE id = ${caseId} AND status = 'generating_image' AND image_claim_id = ${claimId}`;
      return;
  }
  await send("case-image-review", { caseId });
});
