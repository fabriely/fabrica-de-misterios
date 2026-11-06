import { z } from "zod";

const trimmedString = z.string().trim().min(1);

export const configSchema = z
  .object({
    server: z
      .object({
        host: trimmedString,
        port: z.number().int().min(1).max(65_535),
      })
      .strict(),
    database: z
      .object({
        path: trimmedString,
      })
      .strict(),
    openai: z
      .object({
        api_key: z.string().trim().max(300),
        text_model: trimmedString,
        image_model: trimmedString,
        reasoning_effort: z.enum([
          "none",
          "low",
          "medium",
          "high",
          "xhigh",
          "max",
        ]),
        image_quality: z.enum(["low", "medium", "high", "auto"]),
        timeout_seconds: z.number().int().min(5).max(600),
        max_retries: z.number().int().min(0).max(3),
        max_output_tokens: z.number().int().min(1_000).max(30_000),
      })
      .strict(),
    generation: z
      .object({
        provider: z.enum(["mock", "openai"]),
        suspect_count: z.number().int().min(2).max(8),
        document_count: z.number().int().min(1).max(12),
        image_count: z.literal(1),
        max_case_generations_per_hour: z.number().int().min(1).max(100),
      })
      .strict(),
  })
  .strict()
  .superRefine((config, context) => {
    if (
      config.generation.provider === "openai" &&
      (config.openai.api_key.length < 20 ||
        !config.openai.api_key.startsWith("sk-"))
    ) {
      context.addIssue({
        code: "custom",
        message: "é obrigatória e deve começar com sk- no provedor openai",
        path: ["openai", "api_key"],
      });
    }
  });

export type AppConfig = z.infer<typeof configSchema>;

export type SafeConfigSummary = {
  server: AppConfig["server"];
  database: AppConfig["database"];
  openai: Omit<AppConfig["openai"], "api_key"> & {
    api_key: "[REDACTED]";
  };
  generation: AppConfig["generation"];
};

export function createSafeConfigSummary(config: AppConfig): SafeConfigSummary {
  return {
    server: { ...config.server },
    database: { ...config.database },
    openai: {
      api_key: "[REDACTED]",
      text_model: config.openai.text_model,
      image_model: config.openai.image_model,
      reasoning_effort: config.openai.reasoning_effort,
      image_quality: config.openai.image_quality,
      timeout_seconds: config.openai.timeout_seconds,
      max_retries: config.openai.max_retries,
      max_output_tokens: config.openai.max_output_tokens,
    },
    generation: { ...config.generation },
  };
}
