import { randomUUID } from "node:crypto";
import { handleCallback } from "@vercel/queue";
import { caseBundleSchema, caseIdSchema } from "@fabrica/contracts";
import { measured } from "../apps/api/src/ai/monitoring.js";
import { assessQuality } from "../apps/api/src/ai/quality.js";
import { db } from "./_shared/db.js";
import { recordOperation, saveQuality } from "./_shared/observability.js";

export const POST = handleCallback(async (message:unknown) => {
  const caseId=caseIdSchema.parse((message as {caseId?:unknown}).caseId);
  const sql=db(); const claimId=randomUUID();
  const claimed=await sql`UPDATE cases SET quality_claim_id=${claimId},quality_claimed_at=NOW()
    WHERE id=${caseId} AND status='ready'
      AND NOT EXISTS (SELECT 1 FROM case_quality_reviews WHERE case_id=${caseId} AND review_json->>'status'='completed')
      AND (quality_claimed_at IS NULL OR quality_claimed_at < NOW() - INTERVAL '2 minutes')
    RETURNING public_case_json,private_solution_json`;
  if(!claimed[0]) return;
  const provider=process.env.JUDGE_PROVIDER === "mock" || (process.env.JUDGE_PROVIDER !== "openai" && process.env.GENERATION_PROVIDER === "mock") ? "mock" : "openai";
  const model=process.env.OPENAI_JUDGE_MODEL ?? process.env.OPENAI_TEXT_MODEL ?? "gpt-6-luna";
  try {
    const bundle=caseBundleSchema.parse({publicCase:claimed[0].public_case_json,privateSolution:claimed[0].private_solution_json});
    const result=await measured(recordOperation,"quality_review",{caseId},
      ()=>assessQuality(bundle,{provider,model,apiKey:process.env.OPENAI_API_KEY}),
      (value)=>value?.metadata ?? {provider,model});
    await saveQuality(result.review);
  } catch {
    await saveQuality({caseId,status:"failed",evaluator:provider,model,rubricVersion:"quality-v1",
      scores:null,totalScore:null,findings:["A avaliação de qualidade falhou."],reviewedAt:new Date().toISOString()});
  } finally {
    await sql`UPDATE cases SET quality_claim_id=NULL,quality_claimed_at=NULL WHERE id=${caseId} AND quality_claim_id=${claimId}`;
  }
});
