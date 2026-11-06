import type { AppConfig } from "../config/index.js";
import { MockCaseGenerator } from "./mock-case-generator.js";
import { OpenAiCaseGenerator } from "./openai-case-generator.js";
import type { TextCaseGenerator } from "./types.js";

export function createTextCaseGenerator(config: AppConfig): TextCaseGenerator {
  if (config.generation.provider === "mock") {
    return new MockCaseGenerator();
  }

  return new OpenAiCaseGenerator(config.openai);
}
