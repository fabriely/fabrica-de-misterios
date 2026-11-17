import { randomUUID } from "node:crypto";
import { caseBundleSchema } from "@fabrica/contracts";
import { db } from "./db.js";
import { failedJudgment, judgeAccusation } from "../../apps/api/src/ai/juror.js";
import { measured } from "../../apps/api/src/ai/monitoring.js";
import { findJudgment, recordOperation } from "./observability.js";

export async function executeJudgment(caseId:string,playerId:string) {
  const sql=db();
  const claimId=randomUUID();
  const claimed = await sql`UPDATE accusation_judgments SET judgment_claim_id=${claimId},claimed_at=NOW()
    WHERE case_id=${caseId} AND player_id=${playerId}
      AND (judgment_json IS NULL OR judgment_json->>'status'='failed')
      AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '3 minutes')
    RETURNING suspect_id,argument`;
  if (!claimed[0]) return findJudgment(caseId,playerId);
  const row=claimed[0];
  const cases=await sql`SELECT public_case_json,private_solution_json FROM cases WHERE id=${caseId} AND status='ready'`;
  const provider = process.env.JUDGE_PROVIDER === "mock" || (process.env.JUDGE_PROVIDER !== "openai" && process.env.GENERATION_PROVIDER === "mock") ? "mock" : "openai";
  const model = process.env.OPENAI_JUDGE_MODEL ?? process.env.OPENAI_TEXT_MODEL ?? "gpt-6-luna";
  const argument=String(row.argument);
  const accusedId=String(row.suspect_id);
  let judgment;
  if (!cases[0]) throw new Error("Caso indisponível para julgamento.");
  const bundle=caseBundleSchema.parse({publicCase:cases[0].public_case_json,privateSolution:cases[0].private_solution_json});
  const accused=bundle.publicCase.suspects.find(s=>s.id===accusedId);
  if(!accused) throw new Error("Suspeito inexistente.");
  try {
    const result=await measured(recordOperation,"accusation_judgment",{caseId},
      ()=>judgeAccusation(bundle,accusedId,argument,{provider,model,apiKey:process.env.OPENAI_API_KEY}),
      (value)=>value?.metadata??{provider,model});
    judgment=result.judgment;
  } catch {
    judgment=failedJudgment(caseId,accusedId===bundle.privateSolution.culpritId,accused.name,argument,provider,model);
  }
  await sql`UPDATE accusation_judgments SET judgment_json=${JSON.stringify(judgment)}::jsonb,judgment_claim_id=NULL,claimed_at=NULL
    WHERE case_id=${caseId} AND player_id=${playerId} AND judgment_claim_id=${claimId}`;
  return judgment;
}
