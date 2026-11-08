import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { API_PATHS } from "@fabrica/contracts";
import { buildApp } from "../app.js";
import type { AppConfig } from "../config/index.js";
import {
  AccusationRepository,
  CaseRepository,
  PremiseRepository,
  openDatabase,
} from "../database/index.js";
import { AccusationService } from "../accusation/index.js";
import {
  CaseGenerationQueue,
  CaseTextGenerationService,
  DefaultCaseGenerationWorkflow,
  MockCaseGenerator,
  MockPremiseGenerator,
} from "../generation/index.js";
import {
  CaseImageGenerationService,
  LocalImageStorage,
  SvgImageGenerator,
} from "../image/index.js";

const PENDING_CASE_ID = "a9eb6fac-f14b-4190-a637-aae9c36b8444";
const PREMISE_SET_ID = "bb605bfc-f63b-4242-b0d8-8190ff25c3ef";
const PLAYER_ID = "bd73b2e1-ccfb-4af4-82b4-b20d6400cdb2";
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
  it("offers three premise options before creating a case", async () => {
    const context = await createGameContext();
    const response = await context.app.inject({
      method: "POST",
      url: API_PATHS.premises,
      payload: { briefing: validBriefing() },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().options).toHaveLength(3);
    expect(response.body).not.toContain("culpritId");
    expect(response.body).not.toContain("privateSolution");
    expect(context.cases.countCreatedSince("2000-01-01T00:00:00.000Z")).toBe(0);
    const selected = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: { premiseSetId: response.json().id, premiseId: "premise_2" },
    });
    expect(selected.statusCode).toBe(202);
    await context.queue.drain();
    const dossier = await context.app.inject({ method: "GET", url: API_PATHS.case(selected.json().caseId) });
    expect(dossier.json().title).toBe(response.json().options[1].title);
  });

  it("completes the MVP journey from creation to the final reveal", async () => {
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
      briefing: validBriefing(),
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

    const accusation = await context.app.inject({
      method: "POST",
      url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
      payload: { suspectName: "Helena Prado" },
    });
    expect(accusation.statusCode).toBe(201);
    expect(accusation.json()).toMatchObject({
      caseId,
      correct: true,
      accusedName: "Helena Prado",
    });
    expect(accusation.body).not.toContain("culpritId");
    expect(accusation.body).not.toContain("motive");

    const reveal = await context.app.inject({
      method: "GET",
      url: API_PATHS.reveal(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
    });
    expect(reveal.statusCode).toBe(200);
    expect(reveal.json()).toMatchObject({
      caseId,
      correct: true,
      culpritId: "suspect_1",
      culpritName: "Helena Prado",
      decisiveEvidenceIds: ["document_1", "visual_clue_1"],
    });

    const secondAttempt = await context.app.inject({
      method: "POST",
      url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
      payload: { suspectName: "Otávio Leme" },
    });
    expect(secondAttempt.statusCode).toBe(409);
  });

  it("validates creation requests without creating a case", async () => {
    const context = await createGameContext();
    const invalid = await context.app.inject({
      method: "POST",
      url: API_PATHS.premises,
      payload: {
        briefing: {
          ...validBriefing(),
          period: "custom",
          customPeriod: null,
        },
      },
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ code: "invalid_request" });
    expect(context.cases.countCreatedSince("2000-01-01T00:00:00.000Z")).toBe(0);
  });

  it("enforces the persistent hourly generation budget", async () => {
    const now = new Date("2026-11-06T20:00:00.000Z");
    const context = await createGameContext({
      maxCasesPerHour: 1,
      now: () => now,
    });

    const first = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: validCreateCaseRequest(),
    });
    const limited = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: validCreateCaseRequest(),
    });

    expect(first.statusCode).toBe(202);
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBe("3600");
    expect(limited.json()).toMatchObject({
      code: "generation_limit_reached",
    });
    await context.queue.drain();
  });

  it("distinguishes invalid, missing and not-yet-ready cases", async () => {
    const context = await createGameContext();
    context.cases.createPending({
      id: PENDING_CASE_ID,
      briefing: validBriefing(),
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

  it("accepts exactly one accusation and exposes only its minimal outcome", async () => {
    const context = await createGameContext();
    const creation = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: validCreateCaseRequest(),
    });
    const caseId = creation.json().caseId as string;
    await context.queue.drain();

    const prematureReveal = await context.app.inject({
      method: "GET",
      url: API_PATHS.reveal(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
    });
    expect(prematureReveal.statusCode).toBe(403);
    expect(prematureReveal.json()).toMatchObject({
      code: "accusation_required",
    });

    const accusation = await context.app.inject({
      method: "POST",
      url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
      payload: { suspectName: "  helena prado  " },
    });

    expect(accusation.statusCode, accusation.body).toBe(201);
    expect(accusation.json()).toMatchObject({
      caseId,
      correct: true,
      accusedName: "Helena Prado",
    });
    expect(accusation.body).not.toContain("culpritId");
    expect(accusation.body).not.toContain("motive");

    const persisted = await context.app.inject({
      method: "GET",
      url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
    });
    expect(persisted.json()).toEqual(accusation.json());

    const reveal = await context.app.inject({
      method: "GET",
      url: API_PATHS.reveal(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
    });
    expect(reveal.statusCode).toBe(200);
    expect(reveal.json()).toMatchObject({
      caseId,
      correct: true,
      culpritId: "suspect_1",
      culpritName: "Helena Prado",
      decisiveEvidenceIds: ["document_1", "visual_clue_1"],
    });
    expect(reveal.json().timeline).toHaveLength(3);

    const secondAttempt = await context.app.inject({
      method: "POST",
      url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
      payload: { suspectName: "Otávio Leme" },
    });
    expect(secondAttempt.statusCode).toBe(409);
    expect(secondAttempt.json()).toMatchObject({
      code: "accusation_already_submitted",
    });
  });

  it("records an incorrect accusation without revealing the culprit", async () => {
    const context = await createGameContext();
    const creation = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: validCreateCaseRequest(),
    });
    const caseId = creation.json().caseId as string;
    await context.queue.drain();

    const invalid = await context.app.inject({
      method: "POST",
      url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
      payload: { suspectName: "Pessoa inexistente" },
    });
    expect(invalid.statusCode).toBe(400);

    const accusation = await context.app.inject({
      method: "POST",
      url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
      payload: { suspectName: "Otávio Leme" },
    });

    expect(accusation.statusCode, accusation.body).toBe(201);
    expect(accusation.json()).toMatchObject({
      correct: false,
      accusedName: "Otávio Leme",
    });
    expect(accusation.body).not.toContain("Helena Prado");
  });

  it("allows only one winner between concurrent accusation requests", async () => {
    const context = await createGameContext();
    const creation = await context.app.inject({
      method: "POST",
      url: API_PATHS.cases,
      payload: validCreateCaseRequest(),
    });
    const caseId = creation.json().caseId as string;
    await context.queue.drain();

    const attempts = await Promise.all([
      context.app.inject({
        method: "POST",
        url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
        payload: { suspectName: "Helena Prado" },
      }),
      context.app.inject({
        method: "POST",
        url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID },
        payload: { suspectName: "Otávio Leme" },
      }),
    ]);

    expect(attempts.map((response) => response.statusCode).sort()).toEqual([
      201,
      409,
    ]);
  });

  it("keeps each player's accusation and reveal independent on a shared case", async () => {
    const context = await createGameContext();
    const creation = await context.app.inject({ method: "POST", url: API_PATHS.cases, payload: validCreateCaseRequest() });
    const caseId = creation.json().caseId as string;
    await context.queue.drain();
    const otherPlayerId = "3b7bc96a-38ec-41a3-9087-ea4b1769a4fb";

    const first = await context.app.inject({
      method: "POST", url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": PLAYER_ID }, payload: { suspectName: "Helena Prado" },
    });
    expect(first.statusCode).toBe(201);
    const privateReveal = await context.app.inject({
      method: "GET", url: API_PATHS.reveal(caseId), headers: { "X-Player-Id": otherPlayerId },
    });
    expect(privateReveal.statusCode).toBe(403);
    const second = await context.app.inject({
      method: "POST", url: API_PATHS.accusation(caseId),
      headers: { "X-Player-Id": otherPlayerId }, payload: { suspectName: "Otávio Leme" },
    });
    expect(second.statusCode).toBe(201);
    expect(second.json().correct).toBe(false);
    const firstOutcome = await context.app.inject({
      method: "GET", url: API_PATHS.accusation(caseId), headers: { "X-Player-Id": PLAYER_ID },
    });
    expect(firstOutcome.json().correct).toBe(true);
  });
});

async function createGameContext(
  options: { maxCasesPerHour?: number; now?: () => Date } = {},
) {
  const directory = await mkdtemp(path.join(tmpdir(), "fabrica-api-"));
  directories.push(directory);
  const opened = openDatabase({ filename: ":memory:" });
  databases.push(opened.database);
  const cases = new CaseRepository(opened.database);
  const accusations = new AccusationService(
    cases,
    new AccusationRepository(opened.database),
  );
  const images = imagesConfig();
  const premiseRepository = new PremiseRepository(opened.database);
  premiseRepository.save({
    id: PREMISE_SET_ID,
    briefing: validBriefing(),
    options: await new MockPremiseGenerator().generate(validBriefing()),
  });
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
      premises: premiseRepository,
      premiseGenerator: new MockPremiseGenerator(),
      accusations,
      generationQueue: queue,
      generationLimits: {
        maxCasesPerHour: options.maxCasesPerHour ?? 5,
        ...(options.now ? { now: options.now } : {}),
      },
      images,
      baseDirectory: directory,
    },
  });
  apps.push(app);
  return { app, cases, queue };
}

function validCreateCaseRequest() {
  return {
    premiseSetId: PREMISE_SET_ID,
    premiseId: "premise_1" as const,
  };
}

function validBriefing() {
  return {
      period: "victorian" as const,
      customPeriod: null,
      crimeType: "theft" as const,
      setting: "Hotel isolado nas montanhas",
      difficulty: "medium" as const,
      tone: "classic" as const,
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
    max_concurrent_generations: 1,
  };
}
