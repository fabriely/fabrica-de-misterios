import type Database from "better-sqlite3";
import { z } from "zod";
import {
  caseBriefingSchema,
  caseBundleSchema,
  caseGenerationOutputSchema,
  caseIdSchema,
  caseStatusResponseSchema,
  generatedPublicCaseSchema,
  privateSolutionSchema,
  publicCaseSchema,
  timestampSchema,
} from "@fabrica/contracts";
import type {
  CaseBriefing,
  CaseBundle,
  CaseGenerationOutput,
  CaseGenerationStatus,
  CaseStatusResponse,
  GeneratedPublicCase,
  PrivateSolution,
  PublicCase,
} from "@fabrica/contracts";
import {
  InvalidCaseStateError,
  RecordNotFoundError,
} from "./errors.js";
import { parseStoredJson } from "./json.js";

type CaseRow = {
  id: string;
  status: CaseGenerationStatus;
  progress: number;
  briefing_json: string;
  draft_public_case_json: string | null;
  public_case_json: string | null;
  private_solution_json: string | null;
  image_prompt: string | null;
  error_message: string | null;
  text_model: string | null;
  prompt_version: string | null;
  generation_provider: string | null;
  openai_response_id: string | null;
  usage_json: string | null;
  image_provider: string | null;
  image_model: string | null;
  image_usage_json: string | null;
  image_file_path: string | null;
  image_is_fallback: number;
  created_at: string;
  updated_at: string;
};

export type CreatePendingCaseInput = {
  id: string;
  briefing: CaseBriefing;
  createdAt?: string;
};

export type GenerationMetadata = {
  provider: "mock" | "openai";
  textModel: string;
  responseId: string | null;
  promptVersion: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
    totalTokens: number | null;
  };
};

export type StoredGenerationDraft = {
  createdAt: string;
  publicCase: GeneratedPublicCase;
  privateSolution: PrivateSolution;
  imagePrompt: string;
};

export type ImageMetadata = {
  provider: "mock" | "openai" | "fallback";
  model: string;
  filePath: string;
  isFallback: boolean;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
};

export type QueuedCase = {
  caseId: string;
  briefing: CaseBriefing;
};

export class CaseRepository {
  constructor(private readonly database: Database.Database) {}

  createPending(input: CreatePendingCaseInput): CaseStatusResponse {
    const caseId = caseIdSchema.parse(input.id);
    const briefing = caseBriefingSchema.parse(input.briefing);
    const createdAt = timestampSchema.parse(
      input.createdAt ?? new Date().toISOString(),
    );
    const status = caseStatusResponseSchema.parse({
      caseId,
      status: "queued",
      progress: 0,
      errorMessage: null,
    });

    this.database
      .prepare(
        `INSERT INTO cases (
          id, status, progress, briefing_json, created_at, updated_at
        ) VALUES (?, 'queued', 0, ?, ?, ?)`,
      )
      .run(caseId, JSON.stringify(briefing), createdAt, createdAt);

    return status;
  }

  markGeneratingCase(caseId: string): CaseStatusResponse {
    this.transition(caseId, "queued", "generating_case", 15, null);
    return this.requireStatus(caseId);
  }

  saveGenerationDraft(
    caseId: string,
    outputInput: CaseGenerationOutput,
    metadata: GenerationMetadata,
  ): CaseStatusResponse {
    const output = caseGenerationOutputSchema.parse(outputInput);
    const privateSolution = privateSolutionSchema.parse({
      ...output.privateSolution,
      caseId,
    });
    const updatedAt = new Date().toISOString();

    const result = this.database
      .prepare(
        `UPDATE cases SET
          status = 'generating_image',
          progress = 70,
          draft_public_case_json = ?,
          private_solution_json = ?,
          image_prompt = ?,
          text_model = ?,
          prompt_version = ?,
          generation_provider = ?,
          openai_response_id = ?,
          usage_json = ?,
          error_message = NULL,
          updated_at = ?
        WHERE id = ? AND status = 'generating_case'`,
      )
      .run(
        JSON.stringify(output.publicCase),
        JSON.stringify(privateSolution),
        output.imagePrompt,
        metadata.textModel,
        metadata.promptVersion,
        metadata.provider,
        metadata.responseId,
        JSON.stringify(metadata.usage),
        updatedAt,
        caseId,
      );

    this.assertUpdated(result.changes, caseId, "salvar rascunho gerado");
    return this.requireStatus(caseId);
  }

  complete(
    caseInput: PublicCase,
    imageMetadata?: ImageMetadata,
  ): CaseStatusResponse {
    const publicCase = publicCaseSchema.parse(caseInput);
    const privateSolution = this.requirePrivateSolution(publicCase.id);
    caseBundleSchema.parse({ publicCase, privateSolution });

    const result = this.database
      .prepare(
        `UPDATE cases SET
          status = 'ready',
          progress = 100,
          public_case_json = ?,
          image_provider = ?,
          image_model = ?,
          image_usage_json = ?,
          image_file_path = ?,
          image_is_fallback = ?,
          error_message = NULL,
          updated_at = ?
        WHERE id = ? AND status = 'generating_image'`,
      )
      .run(
        JSON.stringify(publicCase),
        imageMetadata?.provider ?? null,
        imageMetadata?.model ?? null,
        imageMetadata ? JSON.stringify(imageMetadata.usage) : null,
        imageMetadata?.filePath ?? null,
        imageMetadata?.isFallback ? 1 : 0,
        new Date().toISOString(),
        publicCase.id,
      );

    this.assertUpdated(result.changes, publicCase.id, "concluir geração");
    return this.requireStatus(publicCase.id);
  }

  fail(caseId: string, message: string): CaseStatusResponse {
    const errorMessage = message.trim().slice(0, 300) || "Falha desconhecida";
    const result = this.database
      .prepare(
        `UPDATE cases SET
          status = 'failed',
          error_message = ?,
          updated_at = ?
        WHERE id = ? AND status NOT IN ('ready', 'failed')`,
      )
      .run(errorMessage, new Date().toISOString(), caseId);

    this.assertUpdated(result.changes, caseId, "marcar como falho");
    return this.requireStatus(caseId);
  }

  findStatus(caseId: string): CaseStatusResponse | null {
    const row = this.findRow(caseId);
    if (!row) return null;

    return caseStatusResponseSchema.parse({
      caseId: row.id,
      status: row.status,
      progress: row.progress,
      errorMessage: row.error_message,
    });
  }

  findPublicCase(caseId: string): PublicCase | null {
    const row = this.findRow(caseId);
    if (!row?.public_case_json) return null;

    return parseStoredJson(
      row.public_case_json,
      publicCaseSchema,
      "caso público",
      caseId,
    );
  }

  findGenerationDraft(caseId: string): StoredGenerationDraft | null {
    const row = this.findRow(caseId);
    if (
      !row?.draft_public_case_json ||
      !row.private_solution_json ||
      !row.image_prompt
    ) {
      return null;
    }

    return {
      createdAt: timestampSchema.parse(row.created_at),
      publicCase: parseStoredJson(
        row.draft_public_case_json,
        generatedPublicCaseSchema,
        "rascunho público",
        caseId,
      ),
      privateSolution: parseStoredJson(
        row.private_solution_json,
        privateSolutionSchema,
        "solução privada",
        caseId,
      ),
      imagePrompt: row.image_prompt,
    };
  }

  findImageMetadata(caseId: string): ImageMetadata | null {
    const row = this.findRow(caseId);
    if (
      !row?.image_provider ||
      !row.image_model ||
      !row.image_usage_json ||
      !row.image_file_path
    ) {
      return null;
    }

    return {
      provider: z.enum(["mock", "openai", "fallback"]).parse(
        row.image_provider,
      ),
      model: row.image_model,
      filePath: row.image_file_path,
      isFallback: row.image_is_fallback === 1,
      usage: parseStoredJson(
        row.image_usage_json,
        imageUsageSchema,
        "uso da imagem",
        caseId,
      ),
    };
  }

  findGenerationMetadata(caseId: string): GenerationMetadata | null {
    const row = this.findRow(caseId);
    if (
      !row?.generation_provider ||
      !row.text_model ||
      !row.prompt_version ||
      !row.usage_json
    ) {
      return null;
    }

    const provider = z.enum(["mock", "openai"]).parse(
      row.generation_provider,
    );
    const usage = parseStoredJson(
      row.usage_json,
      generationUsageSchema,
      "uso da geração",
      caseId,
    );

    return {
      provider,
      textModel: row.text_model,
      responseId: row.openai_response_id,
      promptVersion: row.prompt_version,
      usage,
    };
  }

  findBundleForAccusation(caseId: string): CaseBundle | null {
    const publicCase = this.findPublicCase(caseId);
    if (!publicCase) return null;

    return caseBundleSchema.parse({
      publicCase,
      privateSolution: this.requirePrivateSolution(caseId),
    });
  }

  countCreatedSince(isoTimestamp: string): number {
    const row = this.database
      .prepare("SELECT COUNT(*) AS total FROM cases WHERE created_at >= ?")
      .get(isoTimestamp) as { total: number };

    return row.total;
  }

  recoverAfterRestart(): QueuedCase[] {
    return this.database.transaction(() => {
      const interruptedAt = new Date().toISOString();
      this.database
        .prepare(
          `UPDATE cases SET
            status = 'failed',
            error_message = 'A geração foi interrompida por um reinício. Crie um novo caso para tentar novamente.',
            updated_at = ?
          WHERE status IN ('generating_case', 'generating_image')`,
        )
        .run(interruptedAt);

      const rows = this.database
        .prepare(
          "SELECT id, briefing_json FROM cases WHERE status = 'queued' ORDER BY created_at",
        )
        .all() as Array<{ id: string; briefing_json: string }>;

      return rows.map((row) => ({
        caseId: caseIdSchema.parse(row.id),
        briefing: parseStoredJson(
          row.briefing_json,
          caseBriefingSchema,
          "briefing enfileirado",
          row.id,
        ),
      }));
    })();
  }

  private transition(
    caseId: string,
    from: CaseGenerationStatus,
    to: CaseGenerationStatus,
    progress: number,
    errorMessage: string | null,
  ) {
    const result = this.database
      .prepare(
        `UPDATE cases SET status = ?, progress = ?, error_message = ?, updated_at = ?
         WHERE id = ? AND status = ?`,
      )
      .run(to, progress, errorMessage, new Date().toISOString(), caseId, from);

    this.assertUpdated(result.changes, caseId, `${from} → ${to}`);
  }

  private requireStatus(caseId: string): CaseStatusResponse {
    const status = this.findStatus(caseId);
    if (!status) throw new RecordNotFoundError("Caso", caseId);
    return status;
  }

  private requirePrivateSolution(caseId: string): PrivateSolution {
    const row = this.findRow(caseId);
    if (!row) throw new RecordNotFoundError("Caso", caseId);
    if (!row.private_solution_json) {
      throw new InvalidCaseStateError(caseId, "ler solução privada");
    }

    return parseStoredJson(
      row.private_solution_json,
      privateSolutionSchema,
      "solução privada",
      caseId,
    );
  }

  private findRow(caseId: string): CaseRow | undefined {
    return this.database
      .prepare("SELECT * FROM cases WHERE id = ?")
      .get(caseId) as CaseRow | undefined;
  }

  private assertUpdated(changes: number, caseId: string, operation: string) {
    if (changes > 0) return;
    if (!this.findRow(caseId)) throw new RecordNotFoundError("Caso", caseId);
    throw new InvalidCaseStateError(caseId, operation);
  }
}

const nullableTokenCountSchema = z.number().int().nonnegative().nullable();
const generationUsageSchema = z
  .object({
    inputTokens: nullableTokenCountSchema,
    outputTokens: nullableTokenCountSchema,
    reasoningTokens: nullableTokenCountSchema,
    totalTokens: nullableTokenCountSchema,
  })
  .strict();

const imageUsageSchema = z
  .object({
    inputTokens: nullableTokenCountSchema,
    outputTokens: nullableTokenCountSchema,
    totalTokens: nullableTokenCountSchema,
  })
  .strict();
