export { API_PATHS } from "./health.js";
export type { HealthResponse } from "./health.js";

export { apiErrorCodeSchema, apiErrorResponseSchema } from "./api.js";
export type { ApiErrorCode, ApiErrorResponse } from "./api.js";

export {
  caseIdSchema,
  entityIdSchema,
  longTextSchema,
  paragraphSchema,
  shortTextSchema,
  timestampSchema,
} from "./shared.js";

export {
  caseBriefingSchema,
  createCaseRequestSchema,
  crimeTypeSchema,
  difficultySchema,
  mysteryToneSchema,
  periodPresetSchema,
} from "./briefing.js";
export type {
  CaseBriefing,
  CreateCaseRequest,
  CrimeType,
  Difficulty,
  MysteryTone,
  PeriodPreset,
} from "./briefing.js";
export {
  createPremisesRequestSchema,
  premiseOptionSchema,
  premiseOptionsSchema,
  premiseSetSchema,
  selectedPremiseSchema,
} from "./premise.js";
export type { CreatePremisesRequest, PremiseOption, PremiseSet, SelectedPremise } from "./premise.js";

export {
  caseBundleSchema,
  caseDocumentSchema,
  caseGenerationOutputSchema,
  caseGenerationStatusSchema,
  caseStatusResponseSchema,
  documentTypeSchema,
  generatedPublicCaseSchema,
  generatedSceneSchema,
  privateSolutionDraftSchema,
  privateSolutionSchema,
  publicCaseSchema,
  publicSceneSchema,
  suspectSchema,
  timelineEventSchema,
  visualClueSchema,
} from "./case.js";
export type {
  CaseBundle,
  CaseDocument,
  CaseGenerationOutput,
  CaseGenerationStatus,
  CaseStatusResponse,
  DocumentType,
  GeneratedPublicCase,
  GeneratedScene,
  PrivateSolution,
  PrivateSolutionDraft,
  PublicCase,
  PublicScene,
  Suspect,
  TimelineEvent,
  VisualClue,
} from "./case.js";

export {
  accusationRecordSchema,
  accusationOutcomeSchema,
  accusationResultSchema,
  submitAccusationRequestSchema,
} from "./accusation.js";
export type {
  AccusationRecord,
  AccusationOutcome,
  AccusationResult,
  SubmitAccusationRequest,
} from "./accusation.js";

export { aiOperationSchema, operationStageSchema, caseInsightsSchema, qualityReviewSchema, judgmentSchema, judgmentScoresSchema } from "./insights.js";
export type { AiOperation, OperationStage, QualityReview, CaseInsights, Judgment, JudgmentScores } from "./insights.js";
