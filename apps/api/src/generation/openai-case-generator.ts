import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { caseGenerationOutputSchema } from "@fabrica/contracts";
import type { AppConfig } from "../config/index.js";
import { CaseGenerationProviderError } from "./errors.js";
import {
  buildCaseUserPrompt,
  CASE_AUTHOR_INSTRUCTIONS,
  CASE_PROMPT_VERSION,
} from "./prompts/case-v1.js";
import type {
  CaseGenerationRequest,
  CaseGenerationResult,
  TextCaseGenerator,
} from "./types.js";
import { validateGeneratedCase } from "./validate-output.js";

type OpenAiGenerationConfig = Pick<
  AppConfig["openai"],
  | "api_key"
  | "text_model"
  | "reasoning_effort"
  | "timeout_seconds"
  | "max_retries"
  | "max_output_tokens"
>;

export class OpenAiCaseGenerator implements TextCaseGenerator {
  private readonly client: Pick<OpenAI, "responses">;

  constructor(
    private readonly config: OpenAiGenerationConfig,
    client?: Pick<OpenAI, "responses">,
  ) {
    this.client =
      client ??
      new OpenAI({
        apiKey: config.api_key,
        timeout: config.timeout_seconds * 1_000,
        maxRetries: config.max_retries,
      });
  }

  async generate(
    request: CaseGenerationRequest,
  ): Promise<CaseGenerationResult> {
    const response = await this.client.responses.parse({
      model: this.config.text_model,
      instructions: CASE_AUTHOR_INSTRUCTIONS,
      input: buildCaseUserPrompt(request),
      reasoning: {
        effort: this.config.reasoning_effort,
      },
      text: {
        format: zodTextFormat(caseGenerationOutputSchema, "mystery_case"),
      },
      max_output_tokens: this.config.max_output_tokens,
      store: false,
    });

    if (response.status !== "completed" || !response.output_parsed) {
      throw new CaseGenerationProviderError(
        "A OpenAI não retornou um caso estruturado completo.",
      );
    }

    const output = validateGeneratedCase(response.output_parsed, request);
    const usage = response.usage;

    return {
      output,
      metadata: {
        provider: "openai",
        model: response.model,
        responseId: response.id,
        promptVersion: CASE_PROMPT_VERSION,
        usage: {
          inputTokens: usage?.input_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          reasoningTokens:
            usage?.output_tokens_details?.reasoning_tokens ?? null,
          totalTokens: usage?.total_tokens ?? null,
        },
      },
    };
  }
}
