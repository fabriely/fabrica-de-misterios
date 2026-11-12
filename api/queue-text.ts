import { randomUUID } from "node:crypto";
import { handleCallback, send } from "@vercel/queue";
import { caseBriefingSchema, caseIdSchema, privateSolutionSchema, selectedPremiseSchema } from "@fabrica/contracts";
import { db } from "./_shared/db.js";
import { generateCase } from "./_shared/generation.js";

export const POST = handleCallback(async (message: unknown) => {
  const caseId = caseIdSchema.parse((message as { caseId?: unknown }).caseId);
  const sql = db();
  const claimId = randomUUID();
  const claimed = await sql`UPDATE cases SET status = 'generating_case', progress = 15, generation_claim_id = ${claimId}, updated_at = NOW()
    WHERE id = ${caseId} AND (status = 'queued' OR (status = 'generating_case' AND updated_at < NOW() - INTERVAL '2 minutes'))
    RETURNING briefing_json, selected_premise_json`;
  const row = claimed[0];
  if (!row) {
    const current = await sql`SELECT status FROM cases WHERE id = ${caseId}`;
    if (!current[0] || ["ready", "failed", "generating_image"].includes(String(current[0].status))) return;
    throw new Error("Caso ainda está sendo gerado por outra execução.");
  }
  const briefing = caseBriefingSchema.parse(row.briefing_json);
  const premise = selectedPremiseSchema.parse(row.selected_premise_json);
  try {
    const result = await generateCase(briefing, premise);
    const solution = privateSolutionSchema.parse({ ...result.output.privateSolution, caseId });
    await send("case-image", { caseId });
    const updated = await sql`UPDATE cases SET status = 'generating_image', progress = 70,
      draft_public_case_json = ${JSON.stringify(result.output.publicCase)}::jsonb,
      private_solution_json = ${JSON.stringify(solution)}::jsonb,
      image_prompt = ${result.output.imagePrompt}, generation_claim_id = NULL, updated_at = NOW()
      WHERE id = ${caseId} AND status = 'generating_case' AND generation_claim_id = ${claimId} RETURNING id`;
    if (!updated[0]) return;
  } catch (cause) {
    console.error("[generation] Texto falhou", cause instanceof Error ? cause.name : "UnknownError");
    await sql`UPDATE cases SET status = 'failed', error_message = 'Não foi possível gerar o caso textual.', updated_at = NOW()
      WHERE id = ${caseId} AND status = 'generating_case' AND generation_claim_id = ${claimId}`;
  }
});
