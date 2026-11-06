import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { API_PATHS } from "@fabrica/contracts";
import { buildApp } from "../app.js";
import type { AppConfig } from "../config/index.js";
import { CaseRepository, openDatabase } from "../database/index.js";
import {
  CaseGenerationQueue,
  CaseTextGenerationService,
  DefaultCaseGenerationWorkflow,
  MockCaseGenerator,
} from "../generation/index.js";
import {
  CaseImageGenerationService,
  LocalImageStorage,
  SvgImageGenerator,
} from "../image/index.js";

const PENDING_CASE_ID = "a9eb6fac-f14b-4190-a637-aae9c36b8444";
const databases: Database.Database[] = [];
const directories: string[] = [];
const apps: Array<ReturnType<typeof buildApp>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  for (const database of databases.splice(0)) {
    if (database.open) database.close();
  }
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("public game API", () => {
  it("creates, generates and exposes a complete public case", async () => {
    const context = await createGameContext();

    const creation = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: validCreateCaseRequest(),
    });

    expect(creation.statusCode).toBe(202);
    expect(creation.json()).toMatchObject({ status: "queued", progress: 0 });
    const caseId = creation.json().caseId as string;

    await context.queue.drain();

    const status = await context.app.inject({
      method: "GET",
      url: API_PATHS.caseStatus(caseId),
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      caseId,
      status: "ready",
      progress: 100,
      errorMessage: null,
    });

    const dossier = await context.app.inject({
      method: "GET",
      url: API_PATHS.case(caseId),
    });
    expect(dossier.statusCode).toBe(200);
    expect(dossier.json()).toMatchObject({
      id: caseId,
      briefing: validCreateCaseRequest().briefing,
      suspects: expect.arrayContaining([
        expect.objectContaining({ id: "suspect_1" }),
      ]),
      scene: { imageUrl: `/generated-images/${caseId}.svg` },
    });
    expect(dossier.body).not.toContain("culpritId");
    expect(dossier.body).not.toContain("decisiveEvidenceIds");

    const image = await context.app.inject({
      method: "GET",
      url: dossier.json().scene.imageUrl as string,
    });
    expect(image.statusCode).toBe(200);
    expect(image.headers["content-type"]).toContain("image/svg+xml");
    expect(image.headers["cache-control"]).toContain("immutable");
    expect(image.body).toContain("Cena do caso");
  });

  it("validates creation requests without creating a case", async () => {
    const context = await createGameContext();
    const invalid = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: {
        briefing: {
          ...validCreateCaseRequest().briefing,
          period: "custom",
          customPeriod: null,
        },
      },
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({
      code: "invalid_request",
      message: "Os dados para criar o caso são inválidos.",
    });
    expect(context.cases.countCreatedSince("2000-01-01T00:00:00.000Z")).toBe(0);
  });

  it("distinguishes invalid, missing and not-yet-ready cases", async () => {
    const context = await createGameContext();
    context.cases.createPending({
      id: PENDING_CASE_ID,
      briefing: validCreateCaseRequest().briefing,
    });

    const invalid = await context.app.inject({
      method: "GET",
      url: "/api/cases/not-a-uuid/status",
    });
    expect(invalid.statusCode).toBe(400);

    const missing = await context.app.inject({
      method: "GET",
      url: API_PATHS.caseStatus("d819d84d-35d4-4e70-812a-47b8126f724b"),
    });
    expect(missing.statusCode).toBe(404);

    const pending = await context.app.inject({
      method: "GET",
      url: API_PATHS.case(PENDING_CASE_ID),
    });
    expect(pending.statusCode).toBe(409);
    expect(pending.json()).toEqual({
      code: "case_not_ready",
      message: "O caso ainda está sendo preparado.",
    });
  });

  it("does not serve unknown image files", async () => {
    const context = await createGameContext();
    const response = await context.app.inject({
      method: "GET",
      url: `/generated-images/${PENDING_CASE_ID}.svg`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "not_found" });
  });
});

async function createGameContext() {
  const directory = await mkdtemp(path.join(tmpdir(), "fabrica-api-"));
  directories.push(directory);
  const opened = openDatabase({ filename: ":memory:" });
  databases.push(opened.database);
  const cases = new CaseRepository(opened.database);
  const images = imagesConfig();
  const workflow = new DefaultCaseGenerationWorkflow(
    new CaseTextGenerationService(
      cases,
      new MockCaseGenerator(),
      generationConfig(),
    ),
    new CaseImageGenerationService(
      cases,
      new SvgImageGenerator(),
      new LocalImageStorage(images, directory),
      images,
    ),
  );
  const queue = new CaseGenerationQueue(workflow);
  const app = buildApp({
    game: {
      cases,
      generationQueue: queue,
      images,
      baseDirectory: directory,
    },
  });
  apps.push(app);
  return { app, cases, queue };
}

function validCreateCaseRequest() {
  return {
    briefing: {
      period: "victorian" as const,
      customPeriod: null,
      crimeType: "theft" as const,
      setting: "Hotel isolado nas montanhas",
      difficulty: "medium" as const,
      tone: "classic" as const,
    },
  };
}

function imagesConfig(): AppConfig["images"] {
  return {
    directory: "images",
    public_path: "/generated-images",
    size: "1536x1024",
    format: "webp",
    compression: 85,
    fallback_enabled: true,
  };
}

function generationConfig(): AppConfig["generation"] {
  return {
    provider: "mock",
    suspect_count: 3,
    document_count: 4,
    image_count: 1,
    max_case_generations_per_hour: 5,
  };
}
