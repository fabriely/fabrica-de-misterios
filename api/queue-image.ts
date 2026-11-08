import { randomUUID } from "node:crypto";
import { handleCallback } from "@vercel/queue";
import { put } from "@vercel/blob";
import { caseBundleSchema, caseIdSchema, generatedPublicCaseSchema, privateSolutionSchema, publicCaseSchema } from "@fabrica/contracts";
import { db } from "./_shared/db.js";
import { generateImage } from "./_shared/generation.js";

export const POST = handleCallback(async (message: unknown) => {
  const caseId = caseIdSchema.parse((message as { caseId?: unknown }).caseId);
  const sql = db();
  const claimId = randomUUID();
  const claimed = await sql`UPDATE cases SET image_claimed_at = NOW(), image_claim_id = ${claimId}, updated_at = NOW()
    WHERE id = ${caseId} AND status = 'generating_image'
      AND (image_claimed_at IS NULL OR image_claimed_at < NOW() - INTERVAL '2 minutes')
    RETURNING draft_public_case_json, private_solution_json, image_prompt, created_at`;
  const row = claimed[0];
  if (!row) {
    const current = await sql`SELECT status FROM cases WHERE id = ${caseId}`;
    if (!current[0] || ["ready", "failed"].includes(String(current[0].status))) return;
    throw new Error("Imagem ainda está sendo gerada por outra execução.");
  }
  try {
    const draft = generatedPublicCaseSchema.parse(row.draft_public_case_json);
    const solution = privateSolutionSchema.parse(row.private_solution_json);
    const image = await generateImage(caseId, String(row.image_prompt), draft.scene.imageAlt);
    const blob = await put(`cases/${caseId}/${randomUUID()}.${image.extension}`, Buffer.from(image.bytes), {
      access: "public", contentType: image.mediaType,
    });
    const publicCase = publicCaseSchema.parse({
      ...draft,
      id: caseId,
      createdAt: new Date(row.created_at as string).toISOString(),
      scene: { ...draft.scene, imageUrl: blob.url },
    });
    caseBundleSchema.parse({ publicCase, privateSolution: solution });
    await sql`UPDATE cases SET status = 'ready', progress = 100, public_case_json = ${JSON.stringify(publicCase)}::jsonb,
      error_message = NULL, updated_at = NOW() WHERE id = ${caseId} AND status = 'generating_image'
      AND image_claim_id = ${claimId}`;
  } catch (cause) {
    console.error("[generation] Imagem falhou", cause instanceof Error ? cause.name : "UnknownError");
    await sql`UPDATE cases SET status = 'failed', error_message = 'Não foi possível preparar a imagem do caso.', updated_at = NOW()
      WHERE id = ${caseId} AND status = 'generating_image' AND image_claim_id = ${claimId}`;
  }
});
