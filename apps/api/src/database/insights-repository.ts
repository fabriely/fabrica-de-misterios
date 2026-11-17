import type Database from "better-sqlite3";
import { aiOperationSchema, caseInsightsSchema, qualityReviewSchema, judgmentSchema } from "@fabrica/contracts";
import type { AiOperation, CaseInsights, QualityReview, Judgment } from "@fabrica/contracts";

export class InsightsRepository {
  constructor(private readonly database: Database.Database) {}
  record(operation: AiOperation): void {
    const value = aiOperationSchema.parse(operation);
    this.database.prepare("INSERT OR IGNORE INTO ai_operations(id,case_id,premise_set_id,stage,operation_json) VALUES(?,?,?,?,?)")
      .run(value.id,value.caseId,value.premiseSetId,value.stage,JSON.stringify(value));
  }
  linkPremises(caseId: string, premiseSetId: string): void {
    this.database.prepare("UPDATE ai_operations SET case_id=?, operation_json=json_set(operation_json, '$.caseId', ?) WHERE premise_set_id=? AND case_id IS NULL").run(caseId,caseId,premiseSetId);
  }
  saveQuality(review: QualityReview): void {
    const data = qualityReviewSchema.parse(review);
    this.database.prepare("INSERT INTO case_quality_reviews(case_id,review_json) VALUES(?,?) ON CONFLICT(case_id) DO UPDATE SET review_json=excluded.review_json")
      .run(data.caseId,JSON.stringify(data));
  }
  insights(caseId: string): CaseInsights {
    const operations = (this.database.prepare("SELECT operation_json FROM ai_operations WHERE case_id=? ORDER BY rowid").all(caseId) as {operation_json:string}[])
      .map((row) => aiOperationSchema.parse(JSON.parse(row.operation_json)));
    const row = this.database.prepare("SELECT review_json FROM case_quality_reviews WHERE case_id=?").get(caseId) as {review_json:string}|undefined;
    const quality = row ? qualityReviewSchema.parse(JSON.parse(row.review_json)) : null;
    const timing = this.database.prepare("SELECT created_at,updated_at,status FROM cases WHERE id=?").get(caseId) as
      {created_at:string;updated_at:string;status:string}|undefined;
    const generationWallMs = timing && ["ready","failed"].includes(timing.status)
      ? Math.max(0,Date.parse(timing.updated_at)-Date.parse(timing.created_at)) : null;
    return caseInsightsSchema.parse({ caseId, operations, generationWallMs,
      totalDurationMs: operations.reduce((v,op)=>v+op.durationMs,0),
      estimatedCostUsd: operations.length > 0 && operations.every((op)=>op.estimatedCostUsd !== null)
        ? operations.reduce((v,op)=>v+(op.estimatedCostUsd ?? 0),0) : null,
      hasUnpricedOperations: operations.length === 0 || operations.some((op)=>op.estimatedCostUsd === null), quality });
  }
  reserveJudgment(caseId: string, playerId: string, suspectId: string, argument: string): void {
    this.database.prepare("INSERT OR IGNORE INTO accusation_judgments(case_id,player_id,suspect_id,argument) VALUES(?,?,?,?)")
      .run(caseId,playerId,suspectId,argument);
  }
  saveJudgment(caseId: string, playerId: string, result: Judgment): void {
    this.database.prepare("UPDATE accusation_judgments SET judgment_json=? WHERE case_id=? AND player_id=?")
      .run(JSON.stringify(judgmentSchema.parse(result)),caseId,playerId);
  }
  getJudgmentData(caseId: string, playerId: string): { suspectId: string; argument: string; judgment: Judgment | null } | null {
    const row = this.database.prepare("SELECT suspect_id,argument,judgment_json FROM accusation_judgments WHERE case_id=? AND player_id=?")
      .get(caseId,playerId) as {suspect_id:string;argument:string;judgment_json:string|null}|undefined;
    return row ? { suspectId:row.suspect_id, argument:row.argument,
      judgment:row.judgment_json ? judgmentSchema.parse(JSON.parse(row.judgment_json)) : null } : null;
  }
}
