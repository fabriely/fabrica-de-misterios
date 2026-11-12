import { z } from "zod";
import { shortTextSchema } from "./shared.js";

export const periodPresetSchema = z.enum([
  "medieval",
  "victorian",
  "1920s",
  "contemporary",
  "futuristic",
  "custom",
]);

export const crimeTypeSchema = z.enum([
  "murder",
  "theft",
  "disappearance",
  "sabotage",
]);

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const mysteryToneSchema = z.enum(["classic", "dark", "suspense"]);

export const caseBriefingSchema = z
  .object({
    period: periodPresetSchema,
    customPeriod: z.string().trim().min(2).max(100).nullable(),
    crimeType: crimeTypeSchema,
    setting: shortTextSchema,
    difficulty: difficultySchema,
    tone: mysteryToneSchema,
  })
  .strict()
  .superRefine((briefing, context) => {
    if (briefing.period === "custom" && briefing.customPeriod === null) {
      context.addIssue({
        code: "custom",
        message: "customPeriod é obrigatório quando period é custom",
        path: ["customPeriod"],
      });
    }

    if (briefing.period !== "custom" && briefing.customPeriod !== null) {
      context.addIssue({
        code: "custom",
        message: "customPeriod deve ser null para períodos predefinidos",
        path: ["customPeriod"],
      });
    }
  });

export const createCaseRequestSchema = z
  .object({
    premiseSetId: z.uuid(),
    premiseId: z.enum(["premise_1", "premise_2", "premise_3"]),
  })
  .strict();

export type PeriodPreset = z.infer<typeof periodPresetSchema>;
export type CrimeType = z.infer<typeof crimeTypeSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type MysteryTone = z.infer<typeof mysteryToneSchema>;
export type CaseBriefing = z.infer<typeof caseBriefingSchema>;
export type CreateCaseRequest = z.infer<typeof createCaseRequestSchema>;
