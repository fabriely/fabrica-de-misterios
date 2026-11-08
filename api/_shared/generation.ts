import type { CaseBriefing } from "@fabrica/contracts";
import { MockPremiseGenerator, OpenAiPremiseGenerator } from "../../apps/api/src/generation/premise-generator.js";
import { MockCaseGenerator } from "../../apps/api/src/generation/mock-case-generator.js";
import { OpenAiCaseGenerator } from "../../apps/api/src/generation/openai-case-generator.js";
import { SvgImageGenerator } from "../../apps/api/src/image/svg-image-generator.js";
import { OpenAiImageGenerator } from "../../apps/api/src/image/openai-image-generator.js";
import type { AppConfig } from "../../apps/api/src/config/schema.js";

export function generationConfig(): AppConfig {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  const provider = process.env.GENERATION_PROVIDER === "mock" ? "mock" : "openai";
  if (provider === "openai" && !apiKey) throw new Error("OPENAI_API_KEY não configurada");
  return {
    server: { host: "0.0.0.0", port: 3000, body_limit_kb: 32 },
    database: { path: ":memory:" },
    openai: {
      api_key: apiKey,
      text_model: process.env.OPENAI_TEXT_MODEL ?? "gpt-6-luna",
      image_model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-flare",
      reasoning_effort: "low",
      image_quality: "low",
      timeout_seconds: 48,
      max_retries: 0,
      max_output_tokens: 8000,
    },
    images: { directory: "/tmp", public_path: "/generated-images", size: "1536x1024", format: "webp", compression: 85, fallback_enabled: true },
    generation: { provider, suspect_count: 3, document_count: 4, image_count: 1, max_case_generations_per_hour: 5, max_concurrent_generations: 1 },
  };
}

export async function generatePremises(briefing: CaseBriefing) {
  const config = generationConfig();
  return config.generation.provider === "mock"
    ? new MockPremiseGenerator().generate(briefing)
    : new OpenAiPremiseGenerator(config.openai).generate(briefing);
}

export async function generateCase(briefing: CaseBriefing, premise: { id: "premise_1" | "premise_2" | "premise_3"; title: string; synopsis: string }) {
  const config = generationConfig();
  const generator = config.generation.provider === "mock"
    ? new MockCaseGenerator()
    : new OpenAiCaseGenerator(config.openai);
  return generator.generate({ briefing, premise, suspectCount: config.generation.suspect_count, documentCount: config.generation.document_count });
}

export async function generateImage(caseId: string, prompt: string, altText: string) {
  const config = generationConfig();
  const request = { caseId, prompt, altText };
  try {
    return config.generation.provider === "mock"
      ? await new SvgImageGenerator("mock").generate(request)
      : await new OpenAiImageGenerator({ ...config.openai, ...config.images }).generate(request);
  } catch {
    return new SvgImageGenerator("fallback").generate(request);
  }
}
