import { send } from "@vercel/queue";
import { saveQuality } from "./observability.js";

export async function scheduleQualityReview(caseId: string): Promise<void> {
  try {
    await send("case-quality", { caseId });
  } catch {
    console.error("[quality] Não foi possível agendar a avaliação narrativa.");
    const evaluator = process.env.JUDGE_PROVIDER === "mock"
      || (process.env.JUDGE_PROVIDER !== "openai" && process.env.GENERATION_PROVIDER === "mock")
      ? "mock" : "openai";
    try {
      await saveQuality({
        caseId,
        status: "failed",
        evaluator,
        model: process.env.OPENAI_JUDGE_MODEL ?? process.env.OPENAI_TEXT_MODEL ?? "unknown",
        rubricVersion: "quality-v1",
        scores: null,
        totalScore: null,
        findings: ["Fila de avaliação indisponível."],
        reviewedAt: new Date().toISOString(),
      });
    } catch {
      console.error("[quality] Não foi possível registrar a falha da fila.");
    }
  }
}
