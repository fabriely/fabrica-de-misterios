import { z } from "zod";
import { caseBriefingSchema } from "./briefing.js";
import {
  caseIdSchema,
  entityIdSchema,
  longTextSchema,
  paragraphSchema,
  shortTextSchema,
  timestampSchema,
} from "./shared.js";

export const suspectSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().trim().min(1).max(100),
    role: shortTextSchema,
    description: paragraphSchema,
    relationshipToCase: paragraphSchema,
    alibi: paragraphSchema,
  })
  .strict();

export const documentTypeSchema = z.enum([
  "police_report",
  "witness_statement",
  "forensic_report",
  "communication_log",
  "access_log",
  "financial_record",
  "personal_letter",
  "newspaper",
  "other",
]);

export const caseDocumentSchema = z
  .object({
    id: entityIdSchema,
    title: shortTextSchema,
    type: documentTypeSchema,
    summary: paragraphSchema,
    content: longTextSchema,
  })
  .strict();

export const visualClueSchema = z
  .object({
    id: entityIdSchema,
    label: shortTextSchema,
    description: paragraphSchema,
  })
  .strict();

export const generatedSceneSchema = z
  .object({
    description: paragraphSchema,
    imageAlt: paragraphSchema,
    visibleClues: z.array(visualClueSchema).min(1).max(8),
  })
  .strict();

export const publicSceneSchema = generatedSceneSchema
  .extend({
    imageUrl: z.string().trim().min(1).max(500),
  })
  .strict();

export const generatedPublicCaseSchema = z
  .object({
    briefing: caseBriefingSchema,
    title: shortTextSchema,
    synopsis: paragraphSchema,
    incident: paragraphSchema,
    suspects: z.array(suspectSchema).min(2).max(8),
    documents: z.array(caseDocumentSchema).min(1).max(12),
    scene: generatedSceneSchema,
    investigationInstructions: paragraphSchema,
  })
  .strict();

export const publicCaseSchema = generatedPublicCaseSchema
  .omit({ scene: true })
  .extend({
    id: caseIdSchema,
    createdAt: timestampSchema,
    scene: publicSceneSchema,
  })
  .strict();

export const timelineEventSchema = z
  .object({
    time: z.string().trim().min(1).max(40),
    event: paragraphSchema,
  })
  .strict();

export const privateSolutionDraftSchema = z
  .object({
    culpritId: entityIdSchema,
    motive: paragraphSchema,
    method: paragraphSchema,
    timeline: z.array(timelineEventSchema).min(2).max(16),
    decisiveEvidenceIds: z.array(entityIdSchema).min(2).max(8),
    explanation: longTextSchema,
  })
  .strict();

export const privateSolutionSchema = privateSolutionDraftSchema
  .extend({
    caseId: caseIdSchema,
  })
  .strict();

export const caseGenerationOutputSchema = z
  .object({
    publicCase: generatedPublicCaseSchema,
    privateSolution: privateSolutionDraftSchema,
    imagePrompt: longTextSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateCaseReferences(value.publicCase, value.privateSolution, context, []);
  });

export const caseBundleSchema = z
  .object({
    publicCase: publicCaseSchema,
    privateSolution: privateSolutionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.publicCase.id !== value.privateSolution.caseId) {
      context.addIssue({
        code: "custom",
        message: "privateSolution.caseId deve corresponder ao caso público",
        path: ["privateSolution", "caseId"],
      });
    }

    validateCaseReferences(
      value.publicCase,
      value.privateSolution,
      context,
      [],
    );
  });

export const caseGenerationStatusSchema = z.enum([
  "queued",
  "generating_case",
  "generating_image",
  "ready",
  "failed",
]);

export const caseStatusResponseSchema = z
  .object({
    caseId: caseIdSchema,
    status: caseGenerationStatusSchema,
    progress: z.number().int().min(0).max(100),
    errorMessage: z.string().trim().min(1).max(300).nullable(),
  })
  .strict();

type PublicCaseContent = z.infer<typeof generatedPublicCaseSchema>;
type PrivateSolutionContent = z.infer<typeof privateSolutionDraftSchema>;

function validateCaseReferences(
  publicCase: PublicCaseContent,
  privateSolution: PrivateSolutionContent,
  context: z.RefinementCtx,
  basePath: PropertyKey[],
) {
  reportDuplicates(
    publicCase.suspects.map((suspect) => suspect.id),
    context,
    [...basePath, "publicCase", "suspects"],
    "suspeito",
  );
  reportDuplicates(
    publicCase.documents.map((document) => document.id),
    context,
    [...basePath, "publicCase", "documents"],
    "documento",
  );
  reportDuplicates(
    publicCase.scene.visibleClues.map((clue) => clue.id),
    context,
    [...basePath, "publicCase", "scene", "visibleClues"],
    "pista visual",
  );

  const suspectIds = new Set(publicCase.suspects.map((suspect) => suspect.id));
  if (!suspectIds.has(privateSolution.culpritId)) {
    context.addIssue({
      code: "custom",
      message: "culpritId deve referenciar um suspeito público",
      path: [...basePath, "privateSolution", "culpritId"],
    });
  }

  const evidenceIds = [
    ...publicCase.documents.map((document) => document.id),
    ...publicCase.scene.visibleClues.map((clue) => clue.id),
  ];
  reportDuplicates(
    evidenceIds,
    context,
    [...basePath, "privateSolution", "decisiveEvidenceIds"],
    "evidência pública",
  );

  const availableEvidence = new Set(evidenceIds);
  reportDuplicates(
    privateSolution.decisiveEvidenceIds,
    context,
    [...basePath, "privateSolution", "decisiveEvidenceIds"],
    "evidência decisiva",
  );
  privateSolution.decisiveEvidenceIds.forEach((evidenceId, index) => {
    if (!availableEvidence.has(evidenceId)) {
      context.addIssue({
        code: "custom",
        message: "evidência decisiva deve existir no conteúdo público",
        path: [
          ...basePath,
          "privateSolution",
          "decisiveEvidenceIds",
          index,
        ],
      });
    }
  });
}

function reportDuplicates(
  ids: string[],
  context: z.RefinementCtx,
  path: PropertyKey[],
  label: string,
) {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      message: `IDs de ${label} devem ser únicos`,
      path,
    });
  }
}

export type Suspect = z.infer<typeof suspectSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type CaseDocument = z.infer<typeof caseDocumentSchema>;
export type VisualClue = z.infer<typeof visualClueSchema>;
export type GeneratedScene = z.infer<typeof generatedSceneSchema>;
export type PublicScene = z.infer<typeof publicSceneSchema>;
export type GeneratedPublicCase = z.infer<typeof generatedPublicCaseSchema>;
export type PublicCase = z.infer<typeof publicCaseSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type PrivateSolutionDraft = z.infer<typeof privateSolutionDraftSchema>;
export type PrivateSolution = z.infer<typeof privateSolutionSchema>;
export type CaseGenerationOutput = z.infer<typeof caseGenerationOutputSchema>;
export type CaseBundle = z.infer<typeof caseBundleSchema>;
export type CaseGenerationStatus = z.infer<typeof caseGenerationStatusSchema>;
export type CaseStatusResponse = z.infer<typeof caseStatusResponseSchema>;
