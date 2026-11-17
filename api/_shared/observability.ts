import { aiOperationSchema, caseInsightsSchema, qualityReviewSchema, judgmentSchema } from "@fabrica/contracts";
import type { AiOperation, QualityReview, Judgment } from "@fabrica/contracts";
import { db } from "./db.js";

export async function recordOperation(input: AiOperation) {
  const op = aiOperationSchema.parse(input);
  const sql = db();
  await sql`INSERT INTO ai_operations(id,case_id,premise_set_id,stage,operation_json)
    VALUES (${op.id},${op.caseId},${op.premiseSetId},${op.stage},${JSON.stringify(op)}::jsonb)
    ON CONFLICT (id) DO NOTHING`;
}
export async function linkPremiseOperations(caseId: string, premiseSetId: string) {
  const sql = db();
  await sql`UPDATE ai_operations SET case_id=${caseId}, operation_json=jsonb_set(operation_json,'{caseId}',to_jsonb(${caseId}::text))
    WHERE premise_set_id=${premiseSetId} AND case_id IS NULL`;
}
export async function saveQuality(review: QualityReview) {
  const value=qualityReviewSchema.parse(review);
  const sql=db();
  await sql`INSERT INTO case_quality_reviews(case_id,review_json) VALUES(${value.caseId},${JSON.stringify(value)}::jsonb)
    ON CONFLICT(case_id) DO UPDATE SET review_json=EXCLUDED.review_json`;
}
export async function getInsights(caseId:string) {
  const sql=db();
  const [rows,quality,timings] = await Promise.all([
    sql`SELECT operation_json FROM ai_operations WHERE case_id=${caseId} ORDER BY (operation_json->>'occurredAt') ASC`,
    sql`SELECT review_json FROM case_quality_reviews WHERE case_id=${caseId}`,
    sql`SELECT created_at,updated_at,status FROM cases WHERE id=${caseId}`,
  ]);
  const operations=rows.map(row=>aiOperationSchema.parse(row.operation_json));
  const timing=timings[0];
  const generationWallMs=timing && ["ready","failed"].includes(String(timing.status))
    ? Math.max(0,new Date(timing.updated_at as string).getTime()-new Date(timing.created_at as string).getTime()) : null;
  return caseInsightsSchema.parse({ caseId, operations, generationWallMs, totalDurationMs:operations.reduce((sum,op)=>sum+op.durationMs,0),
    estimatedCostUsd:operations.length > 0 && operations.every(op=>op.estimatedCostUsd!==null) ? operations.reduce((sum,op)=>sum+(op.estimatedCostUsd??0),0) : null,
    hasUnpricedOperations:operations.length === 0 || operations.some(op=>op.estimatedCostUsd===null),
    quality:quality[0] ? qualityReviewSchema.parse(quality[0].review_json) : null });
}
export async function findJudgment(caseId:string,playerId:string):Promise<Judgment|null> {
  const sql=db();
  const rows=await sql`SELECT judgment_json FROM accusation_judgments WHERE case_id=${caseId} AND player_id=${playerId}`;
  return rows[0]?.judgment_json ? judgmentSchema.parse(rows[0].judgment_json) : null;
}
