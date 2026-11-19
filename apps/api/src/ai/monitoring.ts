import { randomUUID } from "node:crypto";
import { aiOperationSchema } from "@fabrica/contracts";
import type { AiOperation, OperationStage } from "@fabrica/contracts";

export type Usage = { inputTokens?: number | null; outputTokens?: number | null; totalTokens?: number | null; inputTextTokens?: number | null; inputImageTokens?: number | null };
export type OperationDetails = { provider: string; model: string; usage?: Usage | undefined; isFallback?: boolean | undefined };
export type Meter = (entry: AiOperation) => void | Promise<void>;

/** Prices are USD per million tokens unless a per-image rate is supplied. */
export function estimateCostUsd(stage: OperationStage, details: OperationDetails): number | null {
  if (details.provider === "mock") return 0;
  if (details.provider === "fallback") return null;
  const prices: Record<string, { inputPerMillion?: number; outputPerMillion?: number; inputTextPerMillion?: number; inputImagePerMillion?: number; perImage?: number }> = {
    // OpenAI Standard rates, checked 2026-11-18. Used for the default visual judge.
    "gpt-6.1-terra": { inputPerMillion: 1, outputPerMillion: 5 },
  };
  try {
    const configured = JSON.parse(process.env.AI_PRICING_JSON ?? "{}");
    if (!configured || typeof configured !== "object" || Array.isArray(configured)) return null;
    Object.assign(prices, configured);
  } catch { return null; }
  // Responses may return a dated snapshot instead of the requested alias.
  const modelFamily = details.model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const price = prices[details.model] ?? (modelFamily === "gpt-6.1-terra" ? prices[modelFamily] : undefined);
  if (!price) return null;
  if (["scene_image", "portraits_image"].includes(stage) && price.inputTextPerMillion !== undefined && price.inputImagePerMillion !== undefined) {
    const text = details.usage?.inputTextTokens;
    const image = details.usage?.inputImageTokens;
    const output = details.usage?.outputTokens;
    const outputRate = price.outputPerMillion;
    if (text == null || image == null || output == null || outputRate == null || ![text, image, output, price.inputTextPerMillion, price.inputImagePerMillion, outputRate].every((value) => Number.isFinite(value) && value >= 0)) return null;
    return Math.round((text * price.inputTextPerMillion + image * price.inputImagePerMillion + output * outputRate) / 1_000_000 * 1e8) / 1e8;
  }
  if (["scene_image", "portraits_image"].includes(stage) && Number.isFinite(price.perImage) && (price.perImage ?? -1) >= 0) return price.perImage!;
  const input = details.usage?.inputTokens;
  const output = details.usage?.outputTokens;
  if (input == null || output == null || !Number.isFinite(price.inputPerMillion) || !Number.isFinite(price.outputPerMillion)) return null;
  if (price.inputPerMillion! < 0 || price.outputPerMillion! < 0) return null;
  return Math.round((input * price.inputPerMillion! + output * price.outputPerMillion!) / 1_000_000 * 1e8) / 1e8;
}

export async function measured<T>(
  meter: Meter | undefined,
  stage: OperationStage,
  target: { caseId?: string | null; premiseSetId?: string | null },
  operation: () => Promise<T>,
  metadata: (result: T | undefined, failure: unknown) => OperationDetails,
): Promise<T> {
  const started = performance.now();
  let result: T | undefined;
  let failure: unknown = null;
  try { result = await operation(); return result; }
  catch (error) { failure = error; throw error; }
  finally {
    const details = metadata(result, failure);
    const record = aiOperationSchema.parse({
      id: randomUUID(), caseId: target.caseId ?? null, premiseSetId: target.premiseSetId ?? null,
      stage, status: failure === null ? "completed" : "failed", provider: details.provider,
      model: details.model, durationMs: Math.round(performance.now() - started),
      inputTokens: details.usage?.inputTokens ?? null, outputTokens: details.usage?.outputTokens ?? null,
      totalTokens: details.usage?.totalTokens ?? null,
      estimatedCostUsd: failure === null ? estimateCostUsd(stage, details) : (details.provider === "mock" ? 0 : null),
      isFallback: details.isFallback ?? false, occurredAt: new Date().toISOString(),
    });
    try { await meter?.(record); } catch { console.error("[observability] Não foi possível registrar a operação."); }
  }
}
