import { createHash } from "node:crypto";
import OpenAI from "openai";
import type { AppConfig } from "../config/index.js";
import type {
  CaseImageGenerator,
  GeneratedImage,
  ImageGenerationRequest,
} from "./types.js";

type OpenAiImageConfig = Pick<
  AppConfig["openai"],
  | "api_key"
  | "image_model"
  | "image_quality"
  | "timeout_seconds"
  | "max_retries"
> &
  Pick<AppConfig["images"], "size" | "format" | "compression">;

export class OpenAiImageGenerator implements CaseImageGenerator {
  private readonly client: Pick<OpenAI, "images">;

  constructor(
    private readonly config: OpenAiImageConfig,
    client?: Pick<OpenAI, "images">,
  ) {
    this.client =
      client ??
      new OpenAI({
        apiKey: config.api_key,
        timeout: config.timeout_seconds * 1_000,
        maxRetries: config.max_retries,
      });
  }

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const response = await this.client.images.generate({
      model: this.config.image_model,
      prompt: `${request.prompt}\n\nSem textos, legendas, marcas d'água ou o rosto do culpado em destaque.`,
      n: 1,
      size: this.config.size,
      quality: this.config.image_quality,
      output_format: this.config.format,
      output_compression: this.config.compression,
      background: "opaque",
      safety_identifier: safetyIdentifier(request.caseId),
    });
    const base64 = response.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error("A OpenAI não retornou os dados da imagem.");
    }

    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0) {
      throw new Error("A OpenAI retornou uma imagem vazia.");
    }

    return {
      bytes,
      extension: this.config.format,
      mediaType: `image/${this.config.format}`,
      metadata: {
        provider: "openai",
        model: this.config.image_model,
        usage: {
          inputTokens: response.usage?.input_tokens ?? null,
          outputTokens: response.usage?.output_tokens ?? null,
          totalTokens: response.usage?.total_tokens ?? null,
        },
      },
    };
  }
}

function safetyIdentifier(caseId: string) {
  return `case_${createHash("sha256").update(caseId).digest("hex").slice(0, 32)}`;
}
