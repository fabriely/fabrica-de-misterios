import { z } from "zod";
import { timelineEventSchema } from "./case.js";
import {
  caseIdSchema,
  entityIdSchema,
  longTextSchema,
  paragraphSchema,
  timestampSchema,
} from "./shared.js";

export const submitAccusationRequestSchema = z
  .object({
    suspectName: z.string().trim().min(1).max(100),
  })
  .strict();

export const accusationRecordSchema = z
  .object({
    id: entityIdSchema,
    caseId: caseIdSchema,
    suspectName: z.string().trim().min(1).max(100),
    normalizedSuspectName: z.string().min(1).max(100),
    submittedAt: timestampSchema,
    correct: z.boolean(),
  })
  .strict();

export const accusationResultSchema = z
  .object({
    caseId: caseIdSchema,
    correct: z.boolean(),
    accusedName: z.string().trim().min(1).max(100),
    culpritId: entityIdSchema,
    culpritName: z.string().trim().min(1).max(100),
    motive: paragraphSchema,
    method: paragraphSchema,
    timeline: z.array(timelineEventSchema).min(2).max(16),
    decisiveEvidenceIds: z.array(entityIdSchema).min(2).max(8),
    explanation: longTextSchema,
    submittedAt: timestampSchema,
  })
  .strict();

export const accusationOutcomeSchema = accusationResultSchema
  .pick({
    caseId: true,
    correct: true,
    accusedName: true,
    submittedAt: true,
  })
  .strict();

export type SubmitAccusationRequest = z.infer<
  typeof submitAccusationRequestSchema
>;
export type AccusationRecord = z.infer<typeof accusationRecordSchema>;
export type AccusationResult = z.infer<typeof accusationResultSchema>;
export type AccusationOutcome = z.infer<typeof accusationOutcomeSchema>;
