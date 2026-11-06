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
        api_key: z
          .string()
          .trim()
          .min(20)
          .refine((value) => value.startsWith("sk-"), {
            message: "deve começar com sk-",
          }),
        text_model: trimmedString,
        image_model: trimmedString,
        reasoning_effort: z.enum(["none", "low", "medium", "high"]),
        image_quality: z.enum(["low", "medium", "high", "auto"]),
        timeout_seconds: z.number().int().min(5).max(600),
        max_retries: z.number().int().min(0).max(3),
      })
      .strict(),
    generation: z
      .object({
        suspect_count: z.number().int().min(2).max(8),
        document_count: z.number().int().min(1).max(12),
        image_count: z.literal(1),
        max_case_generations_per_hour: z.number().int().min(1).max(100),
      })
      .strict(),
  })
  .strict();

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
    },
    generation: { ...config.generation },
  };
}
