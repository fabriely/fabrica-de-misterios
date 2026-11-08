import type { AppConfig } from "../config/index.js";
import { OpenAiImageGenerator } from "./openai-image-generator.js";
import { SvgImageGenerator } from "./svg-image-generator.js";
import type { CaseImageGenerator } from "./types.js";

export function createCaseImageGenerator(config: AppConfig): CaseImageGenerator {
  if (config.generation.provider === "mock") {
    return new SvgImageGenerator("mock");
  }

  return new OpenAiImageGenerator({
    ...config.openai,
    ...config.images,
  });
}
