import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
  accusationResultSchema,
  caseGenerationOutputSchema,
} from "@fabrica/contracts";
import type { AccusationRecord, PublicCase } from "@fabrica/contracts";
import { AccusationRepository } from "./accusation-repository.js";
import { CaseRepository } from "./case-repository.js";
import { AccusationAlreadyExistsError } from "./errors.js";
import { getSchemaVersion, runMigrations } from "./migrate.js";
import { openDatabase } from "./open.js";

const CASE_ID = "d819d84d-35d4-4e70-812a-47b8126f724b";
const CREATED_AT = "2026-11-06T12:00:00.000Z";
const openDatabases: Database.Database[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  for (const database of openDatabases.splice(0)) {
    if (database.open) database.close();
  }

  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("database migrations", () => {
  it("creates the initial schema exactly once", async () => {
    const { database } = await createFileDatabase();

    expect(getSchemaVersion(database)).toBe(4);
    expect(runMigrations(database)).toBe(4);

    const migrations = database
      .prepare("SELECT version, name FROM schema_migrations")
      .all();
    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    expect(migrations).toEqual([
      { version: 1, name: "initial_cases_and_accusations" },
      { version: 2, name: "generation_metadata" },
      { version: 3, name: "image_metadata" },
      { version: 4, name: "accusation_decisive_evidence" },
    ]);
    expect(tables.map((table) => table.name)).toEqual([
      "accusations",
      "cases",
      "schema_migrations",
    ]);
  });
});

describe("CaseRepository", () => {
  it("persists the complete generation lifecycle across restarts", async () => {
    const { database, filename } = await createFileDatabase();
    const repository = new CaseRepository(database);
    const draft = validGenerationOutput();

    expect(
      repository.createPending({
        id: CASE_ID,
        briefing: draft.publicCase.briefing,
        createdAt: CREATED_AT,
      }).status,
    ).toBe("queued");
    expect(repository.markGeneratingCase(CASE_ID).status).toBe(
      "generating_case",
    );
    expect(
      repository.saveGenerationDraft(CASE_ID, draft, {
        provider: "mock",
        textModel: "test-model",
        responseId: null,
        promptVersion: "case-v1",
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          totalTokens: 0,
        },
      }).status,
    ).toBe("generating_image");

    expect(repository.findPublicCase(CASE_ID)).toBeNull();
    expect(repository.findGenerationDraft(CASE_ID)?.imagePrompt).toBe(
      draft.imagePrompt,
    );

    const publicCase = materializePublicCase(draft.publicCase);
    expect(repository.complete(publicCase)).toMatchObject({
      status: "ready",
      progress: 100,
      errorMessage: null,
    });

    database.close();
    const reopened = openDatabase({ filename });
    openDatabases.push(reopened.database);
    const reopenedRepository = new CaseRepository(reopened.database);

    expect(reopenedRepository.findPublicCase(CASE_ID)).toEqual(publicCase);
    expect(reopenedRepository.findBundleForAccusation(CASE_ID)).toMatchObject({
      privateSolution: { culpritId: "suspect_1" },
    });
    expect(
      JSON.stringify(reopenedRepository.findPublicCase(CASE_ID)),
    ).not.toContain("Dívidas do hotel");
  });

  it("stores failures without allowing invalid state transitions", async () => {
    const { database } = await createFileDatabase();
    const repository = new CaseRepository(database);
    const draft = validGenerationOutput();

    repository.createPending({
      id: CASE_ID,
      briefing: draft.publicCase.briefing,
    });

    expect(repository.fail(CASE_ID, "  Falha de geração  ")).toMatchObject({
      status: "failed",
      errorMessage: "Falha de geração",
    });
    expect(() => repository.markGeneratingCase(CASE_ID)).toThrow(
      /não permite a operação/,
    );
  });

  it("counts cases created after a timestamp", async () => {
    const { database } = await createFileDatabase();
    const repository = new CaseRepository(database);
    const briefing = validGenerationOutput().publicCase.briefing;

    repository.createPending({ id: CASE_ID, briefing, createdAt: CREATED_AT });
    repository.createPending({
      id: "a9eb6fac-f14b-4190-a637-aae9c36b8444",
      briefing,
      createdAt: "2026-11-06T14:00:00.000Z",
    });

    expect(repository.countCreatedSince("2026-11-06T13:00:00.000Z")).toBe(1);
  });
});

describe("AccusationRepository", () => {
  it("persists one accusation and rejects a second chance", async () => {
    const { database } = await createFileDatabase();
    const cases = new CaseRepository(database);
    const accusations = new AccusationRepository(database);
    const draft = validGenerationOutput();
    cases.createPending({ id: CASE_ID, briefing: draft.publicCase.briefing });

    const record = validAccusationRecord();
    const result = accusationResultSchema.parse({
      caseId: CASE_ID,
      correct: true,
      accusedName: "Helena Prado",
      culpritId: "suspect_1",
      culpritName: "Helena Prado",
      motive: "Dívidas do hotel.",
      method: "Uso da chave mestra.",
      timeline: draft.privateSolution.timeline,
      decisiveEvidenceIds: draft.privateSolution.decisiveEvidenceIds,
      explanation: draft.privateSolution.explanation,
      submittedAt: record.submittedAt,
    });

    expect(accusations.submit(record, result).result.correct).toBe(true);
    expect(accusations.findByCaseId(CASE_ID)).toEqual({ record, result });
    expect(() =>
      accusations.submit({ ...record, id: "accusation_2" }, result),
    ).toThrow(AccusationAlreadyExistsError);
  });

  it("backfills decisive evidence in accusations created before schema 4", async () => {
    const { database, filename } = await createFileDatabase();
    const cases = new CaseRepository(database);
    const accusations = new AccusationRepository(database);
    const draft = validGenerationOutput();
    cases.createPending({
      id: CASE_ID,
      briefing: draft.publicCase.briefing,
      createdAt: CREATED_AT,
    });
    cases.markGeneratingCase(CASE_ID);
    cases.saveGenerationDraft(CASE_ID, draft, {
      provider: "mock",
      textModel: "mock-case-generator",
      responseId: null,
      promptVersion: "case-v1",
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
      },
    });
    cases.complete(materializePublicCase(draft.publicCase));

    const record = validAccusationRecord();
    accusations.submit(record, {
      caseId: CASE_ID,
      correct: true,
      accusedName: "Helena Prado",
      culpritId: "suspect_1",
      culpritName: "Helena Prado",
      motive: draft.privateSolution.motive,
      method: draft.privateSolution.method,
      timeline: draft.privateSolution.timeline,
      decisiveEvidenceIds: draft.privateSolution.decisiveEvidenceIds,
      explanation: draft.privateSolution.explanation,
      submittedAt: record.submittedAt,
    });

    database.exec(`
      UPDATE accusations
      SET result_json = json_remove(result_json, '$.decisiveEvidenceIds');
      DELETE FROM schema_migrations WHERE version = 4;
    `);
    database.close();

    const reopened = openDatabase({ filename });
    openDatabases.push(reopened.database);
    expect(reopened.schemaVersion).toBe(4);
    expect(
      new AccusationRepository(reopened.database).findByCaseId(CASE_ID)?.result
        .decisiveEvidenceIds,
    ).toEqual(draft.privateSolution.decisiveEvidenceIds);
  });
});

async function createFileDatabase() {
  const directory = await mkdtemp(path.join(tmpdir(), "fabrica-database-"));
  temporaryDirectories.push(directory);
  const filename = path.join(directory, "database.sqlite");
  const opened = openDatabase({ filename });
  openDatabases.push(opened.database);
  return opened;
}

function validAccusationRecord(): AccusationRecord {
  return {
    id: "accusation_1",
    caseId: CASE_ID,
    suspectName: "Helena Prado",
    normalizedSuspectName: "helena prado",
    submittedAt: "2026-11-06T15:00:00.000Z",
    correct: true,
  };
}

function materializePublicCase(
  generated: ReturnType<typeof validGenerationOutput>["publicCase"],
): PublicCase {
  return {
    ...generated,
    id: CASE_ID,
    createdAt: CREATED_AT,
    scene: {
      ...generated.scene,
      imageUrl: "/generated/case-scene.webp",
    },
  };
}

function validGenerationOutput() {
  return caseGenerationOutputSchema.parse({
    publicCase: {
      briefing: {
        period: "victorian",
        customPeriod: null,
        crimeType: "theft",
        setting: "Hotel isolado nas montanhas",
        difficulty: "medium",
        tone: "classic",
      },
      title: "O relógio da suíte 12",
      synopsis: "Uma joia desaparece durante uma tempestade.",
      incident: "A joia foi retirada de um cofre entre 21h e 21h20.",
      suspects: [
        {
          id: "suspect_1",
          name: "Helena Prado",
          role: "Gerente",
          description: "Conhece todas as chaves do hotel.",
          relationshipToCase: "Guardou a joia antes do jantar.",
          alibi: "Afirma que estava no corredor norte.",
        },
        {
          id: "suspect_2",
          name: "Otávio Leme",
          role: "Colecionador",
          description: "Disputa peças raras em leilões.",
          relationshipToCase: "Tentou comprar a joia naquela tarde.",
          alibi: "Diz ter permanecido na biblioteca.",
        },
      ],
      documents: [
        {
          id: "document_1",
          title: "Registro da fechadura",
          type: "access_log",
          summary: "Lista as aberturas da suíte.",
          content: "21:08 — chave mestra utilizada.",
        },
      ],
      scene: {
        description: "O cofre está aberto e o relógio parado.",
        imageAlt: "Suíte vitoriana com cofre aberto.",
        visibleClues: [
          {
            id: "visual_clue_1",
            label: "Relógio parado",
            description: "O relógio parou às 21:10.",
          },
        ],
      },
      investigationInstructions: "Compare os horários antes de acusar.",
    },
    privateSolution: {
      culpritId: "suspect_1",
      motive: "Dívidas do hotel.",
      method: "Uso da chave mestra.",
      timeline: [
        { time: "21:08", event: "Helena abriu a suíte." },
        { time: "21:10", event: "A joia foi retirada." },
      ],
      decisiveEvidenceIds: ["document_1", "visual_clue_1"],
      explanation: "A chave mestra e o relógio contradizem Helena.",
    },
    imagePrompt: "Suíte vitoriana com cofre aberto e relógio parado.",
  });
}
