import { afterEach, describe, expect, it } from "vitest";
import type { CaseBriefing, CaseBundle } from "@fabrica/contracts";
import { MockCaseGenerator } from "../generation/mock-case-generator.js";
import { estimateCostUsd, measured } from "./monitoring.js";
import { judgeAccusation } from "./juror.js";
import { assessQuality } from "./quality.js";

const caseId = "ed14f563-fc93-4137-8262-b3fa55100155";
const original = process.env.AI_PRICING_JSON;
afterEach(() => { if (original === undefined) delete process.env.AI_PRICING_JSON; else process.env.AI_PRICING_JSON = original; });
const briefing: CaseBriefing = { period:"contemporary", customPeriod:null, crimeType:"theft", setting:"uma mansão", difficulty:"medium", tone:"suspense" };
async function bundle():Promise<CaseBundle> {
  const {output} = await new MockCaseGenerator().generate({briefing,suspectCount:3,documentCount:4});
  return {
    publicCase:{ ...output.publicCase,id:caseId, createdAt:new Date().toISOString(), scene:{...output.publicCase.scene,imageUrl:"/generated-images/example.svg"}},
    privateSolution:{...output.privateSolution,caseId},
  };
}
describe("instrumentação, qualidade e julgamento",()=>{
  it("mantém custo desconhecido como nulo e calcula usando tarifas explicitadas",()=>{
    expect(estimateCostUsd("case_text",{provider:"openai",model:"custom-model",usage:{inputTokens:1000,outputTokens:500}})).toBeNull();
    process.env.AI_PRICING_JSON=JSON.stringify({"custom-model":{inputPerMillion:1,outputPerMillion:4,perImage:.05}});
    expect(estimateCostUsd("case_text",{provider:"openai",model:"custom-model",usage:{inputTokens:1000,outputTokens:500}})).toBe(.003);
    expect(estimateCostUsd("scene_image",{provider:"openai",model:"custom-model"})).toBe(.05);
    expect(estimateCostUsd("scene_image",{provider:"fallback",model:"svg"})).toBeNull();
  });
  it("registra operação de sucesso e de falha sem esconder o erro",async()=>{
    const entries: Array<{status:string;durationMs:number}> = [];
    const meter = (entry:{status:"completed"|"failed";durationMs:number})=>{entries.push(entry);};
    expect(await measured(meter,"case_text",{caseId},async()=>42,()=>({provider:"mock",model:"m"}))).toBe(42);
    await expect(measured(meter,"case_text",{caseId},async()=>{throw new Error("falhou");},()=>({provider:"mock",model:"m"}))).rejects.toThrow("falhou");
    expect(entries.map(e=>e.status)).toEqual(["completed","failed"]);
    expect(entries.every(e=>e.durationMs>=0)).toBe(true);
  });
  it("não finge que o modo mock fez análise semântica",async()=>{
    const data=await bundle();
    const review=await assessQuality(data,{provider:"mock",model:"mock"});
    expect(review.review.totalScore).toBe(68);
    expect(review.review.findings[0]).toContain("demonstrativa");
    const result=await judgeAccusation(data,"suspect_1","O registro de acesso contradiz o álibi.",{provider:"mock",model:"mock"});
    expect(result.judgment.correct).toBe(true);
    expect(result.judgment.totalScore).toBe(35);
    expect(result.judgment.feedback).toContain("não julga semanticamente");
    const wrong=await judgeAccusation(data,"suspect_2","Acho que foi essa pessoa.",{provider:"mock",model:"mock"});
    expect(wrong.judgment.correct).toBe(false);
    expect(wrong.judgment.totalScore).toBe(0);
  });
});
