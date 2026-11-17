import { z } from "zod";
import { caseIdSchema, entityIdSchema, timestampSchema } from "./shared.js";

export const operationStageSchema = z.enum([
  "premises", "case_text", "scene_image", "portraits_image", "visual_review", "quality_review", "accusation_judgment",
]);
export const aiOperationSchema = z.object({
  id: z.string().uuid(),
  caseId: caseIdSchema.nullable(),
  premiseSetId: caseIdSchema.nullable(),
  stage: operationStageSchema,
  status: z.enum(["completed", "failed"]),
  provider: z.string(), model: z.string(),
  durationMs: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  isFallback: z.boolean(),
  occurredAt: timestampSchema,
}).strict();
export const qualityReviewSchema = z.object({
  caseId: caseIdSchema,
  status: z.enum(["completed", "failed"]),
  evaluator: z.enum(["mock", "openai"]),
  model: z.string(),
  rubricVersion: z.literal("quality-v1"),
  scores: z.object({ solvability: z.number().int().min(0).max(30), logic: z.number().int().min(0).max(25), evidence: z.number().int().min(0).max(20), fairness: z.number().int().min(0).max(15), originality: z.number().int().min(0).max(10) }).strict().nullable(),
  totalScore: z.number().int().min(0).max(100).nullable(),
  findings: z.array(z.string().max(500)).max(8),
  reviewedAt: timestampSchema,
}).strict();
export const caseInsightsSchema = z.object({
  caseId: caseIdSchema,
  operations: z.array(aiOperationSchema),
  totalDurationMs: z.number().int().nonnegative(),
  generationWallMs: z.number().int().nonnegative().nullable(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  hasUnpricedOperations: z.boolean(),
  quality: qualityReviewSchema.nullable(),
}).strict();
export const judgmentScoresSchema = z.object({
  evidence: z.number().int().min(0).max(30),
  motive: z.number().int().min(0).max(15),
  method: z.number().int().min(0).max(10),
  chronology: z.number().int().min(0).max(10),
}).strict();
export const judgmentSchema = z.object({
  caseId: caseIdSchema,
  status: z.enum(["completed", "failed", "skipped"]),
  provider: z.enum(["mock", "openai"]),
  model: z.string(),
  rubricVersion: z.literal("juror-v1"),
  correct: z.boolean(),
  accusedName: z.string(),
  argument: z.string(),
  scores: judgmentScoresSchema.nullable(),
  totalScore: z.number().int().min(0).max(100).nullable(),
  recognizedEvidenceIds: z.array(entityIdSchema).max(12),
  feedback: z.string().max(2000),
  shortcomings: z.array(z.string().max(350)).max(6),
  judgedAt: timestampSchema,
}).strict();
export type AiOperation = z.infer<typeof aiOperationSchema>;
export type OperationStage = z.infer<typeof operationStageSchema>;
export type QualityReview = z.infer<typeof qualityReviewSchema>;
export type CaseInsights = z.infer<typeof caseInsightsSchema>;
export type Judgment = z.infer<typeof judgmentSchema>;
export type JudgmentScores = z.infer<typeof judgmentScoresSchema>;
