import type { CaseRepository } from "../database/case-repository.js";
import type { InsightsRepository } from "../database/insights-repository.js";
import type { AccusationRepository } from "../database/accusation-repository.js";
import { measured } from "./monitoring.js";
import type { OperationDetails } from "./monitoring.js";
import { assessQuality } from "./quality.js";
import { failedJudgment, judgeAccusation } from "./juror.js";

export type AiSettings = { provider: "mock" | "openai"; model: string; apiKey?: string | undefined };
export class IntelligenceServices {
  private readonly inFlight = new Map<string, Promise<void>>();
  constructor(private readonly cases: CaseRepository,
    private readonly accusations: AccusationRepository,
    private readonly insights: InsightsRepository,
    private readonly settings: AiSettings) {}
  async reviewQuality(caseId: string): Promise<void> {
    const bundle = this.cases.findBundleForAccusation(caseId);
    if (!bundle) return;
    let metadata: OperationDetails = { provider: this.settings.provider, model: this.settings.model };
    try {
      const result = await measured((entry)=>this.insights.record(entry),"quality_review",{caseId},
        () => assessQuality(bundle,this.settings), (value)=> value?.metadata ?? metadata);
      metadata = result.metadata;
      this.insights.saveQuality(result.review);
    } catch {
      this.insights.saveQuality({caseId,status:"failed",evaluator:this.settings.provider,model:metadata.model,
        rubricVersion:"quality-v1",scores:null,totalScore:null,findings:["Não foi possível concluir a avaliação de qualidade."],reviewedAt:new Date().toISOString()});
    }
  }
  reserve(caseId:string,playerId:string,suspectId:string,argument:string): void {
    this.insights.reserveJudgment(caseId,playerId,suspectId,argument);
  }
  getJudgment(caseId:string,playerId:string) { return this.insights.getJudgmentData(caseId,playerId)?.judgment ?? null; }
  async judge(caseId:string,playerId:string): Promise<void> {
    const key = `${caseId}:${playerId}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const work = this.judgeOnce(caseId,playerId);
    this.inFlight.set(key,work);
    try { await work; } finally { this.inFlight.delete(key); }
  }
  private async judgeOnce(caseId:string,playerId:string): Promise<void> {
    const saved = this.insights.getJudgmentData(caseId,playerId);
    const accusation = this.accusations.findByCaseId(caseId,playerId);
    const bundle = this.cases.findBundleForAccusation(caseId);
    if (!saved || !accusation || !bundle || saved.judgment?.status === "completed") return;
    const accused = bundle.publicCase.suspects.find((suspect)=>suspect.id===saved.suspectId);
    if (!accused) return;
    try {
      const result = await measured((op)=>this.insights.record(op),"accusation_judgment",{caseId},
        () => judgeAccusation(bundle,saved.suspectId,saved.argument,this.settings),
        (value)=>value?.metadata ?? {provider:this.settings.provider,model:this.settings.model});
      this.insights.saveJudgment(caseId,playerId,result.judgment);
    } catch {
      this.insights.saveJudgment(caseId,playerId,failedJudgment(caseId,accusation.result.correct,accused.name,saved.argument,this.settings.provider,this.settings.model));
    }
  }
}
