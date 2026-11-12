import { z } from "zod";
import { caseBriefingSchema } from "./briefing.js";
import { caseIdSchema, paragraphSchema, shortTextSchema } from "./shared.js";

export const premiseOptionSchema = z.object({
  id: z.enum(["premise_1", "premise_2", "premise_3"]),
  title: shortTextSchema,
  synopsis: paragraphSchema,
}).strict();

export const premiseOptionsSchema = z.array(premiseOptionSchema).length(3).superRefine((options, context) => {
  if (new Set(options.map((option) => option.id)).size !== 3) {
    context.addIssue({ code: "custom", message: "As premissas precisam ter IDs distintos." });
  }
});

export const createPremisesRequestSchema = z.object({ briefing: caseBriefingSchema }).strict();
export const premiseSetSchema = z.object({
  id: caseIdSchema,
  briefing: caseBriefingSchema,
  options: premiseOptionsSchema,
}).strict();
export const selectedPremiseSchema = premiseOptionSchema;

export type PremiseOption = z.infer<typeof premiseOptionSchema>;
export type PremiseSet = z.infer<typeof premiseSetSchema>;
export type CreatePremisesRequest = z.infer<typeof createPremisesRequestSchema>;
export type SelectedPremise = z.infer<typeof selectedPremiseSchema>;
