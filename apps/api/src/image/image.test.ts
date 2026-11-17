import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import type OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../config/index.js";
import { CaseRepository, openDatabase } from "../database/index.js";
import { MockCaseGenerator } from "../generation/index.js";
import { LocalImageStorage } from "./local-image-storage.js";
import { OpenAiImageGenerator } from "./openai-image-generator.js";
import { CaseImageGenerationService } from "./service.js";
import { SvgImageGenerator } from "./svg-image-generator.js";
import type { CaseImageGenerator } from "./types.js";
import { OpenAiVisualJudge, reviewPassed } from "./visual-judge.js";
import type { VisualJudge, VisualReview } from "./visual-judge.js";

const CASE_ID = "d819d84d-35d4-4e70-812a-47b8126f724b";
const databases: Database.Database[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  for (const database of databases.splice(0)) {
    if (database.open) database.close();
  }
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("OpenAiImageGenerator", () => {
  it("requests exactly one economical image and decodes its base64 data", async () => {
    const generate = vi.fn().mockResolvedValue({
      created: 1,
      data: [{ b64_json: Buffer.from("fake-image").toString("base64") }],
      usage: { input_tokens: 18, output_tokens: 75, total_tokens: 93 },
    });
    const client = { images: { generate } } as unknown as Pick<OpenAI, "images">;
    const generator = new OpenAiImageGenerator(openAiImageConfig(), client);

    const result = await generator.generate(imageRequest());

    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-image-2.5-flare",
      n: 1,
      size: "1536x1024",
      quality: "low",
      output_format: "webp",
      output_compression: 85,
      background: "opaque",
    });
    expect(generate.mock.calls[0]?.[0].safety_identifier).toMatch(
      /^case_[a-f0-9]{32}$/,
    );
    expect(Buffer.from(result.bytes).toString()).toBe("fake-image");
    expect(result.metadata).toEqual({
      provider: "openai",
      model: "gpt-image-2.5-flare",
      usage: { inputTokens: 18, outputTokens: 75, totalTokens: 93 },
    });
  });

  it("rejects an empty provider response", async () => {
    const client = {
      images: { generate: vi.fn().mockResolvedValue({ created: 1, data: [] }) },
    } as unknown as Pick<OpenAI, "images">;

    await expect(
      new OpenAiImageGenerator(openAiImageConfig(), client).generate(
        imageRequest(),
      ),
    ).rejects.toThrow(/dados da imagem/);
  });

  it("requests a neutral portrait sheet without hiding the culprit's face", async () => {
    const generate = vi.fn().mockResolvedValue({
      data: [{ b64_json: Buffer.from("portrait-sheet").toString("base64") }],
    });
    const client = { images: { generate } } as unknown as Pick<OpenAI, "images">;
    const generator = new OpenAiImageGenerator(openAiImageConfig(), client);

    await generator.generate({ ...imageRequest(), purpose: "portrait_sheet", portraitCount: 3 });

    expect(generate.mock.calls[0]?.[0].prompt).toContain("Sem textos, legendas");
    expect(generate.mock.calls[0]?.[0].prompt).not.toContain("rosto do culpado");
  });
});

describe("OpenAiVisualJudge", () => {
  it("reviews the actual scene image and reports visible scale defects", async () => {
    const repository = await preparedRepository();
    const draft = repository.findGenerationDraft(CASE_ID)!;
    const parse = vi.fn().mockResolvedValue({
      status: "completed", output_parsed: majorScaleIssue(),
      model: "test-vision", id: "test-response",
      usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
    });
    const client = { responses: { parse } } as unknown as Pick<OpenAI, "responses">;
    const judge = new OpenAiVisualJudge(
      { apiKey: "sk-test", model: "test-vision", timeoutSeconds: 42 }, client,
    );

    const result = await judge.review({
      imageUrl: "data:image/png;base64,YWJj", draft: draft.publicCase, imagePrompt: draft.imagePrompt,
    });

    expect(parse).toHaveBeenCalledOnce();
    expect(parse.mock.calls[0]?.[0].input[0].content).toContainEqual({
      type: "input_image", image_url: "data:image/png;base64,YWJj", detail: "original",
    });
    expect(parse.mock.calls[0]?.[0].instructions).toContain("pessoa adulta cabe naturalmente na cama");
    expect(reviewPassed(result.review)).toBe(false);
    expect(result.usage.totalTokens).toBe(20);
  });
});

describe("LocalImageStorage", () => {
  it("stores a case-scoped file and returns only its public URL", async () => {
    const directory = await createTemporaryDirectory();
    const storage = new LocalImageStorage(
      { directory: "scenes", public_path: "/generated-images/" },
      directory,
    );
    const image = await new SvgImageGenerator().generate(imageRequest());

    const stored = await storage.save(CASE_ID, image);

    expect(stored.publicUrl).toBe(`/generated-images/${CASE_ID}.svg`);
    expect(stored.filePath).toBe(path.join(directory, "scenes", `${CASE_ID}.svg`));
    expect(await readFile(stored.filePath, "utf8")).toContain("Cena do caso");
  });

  it("keeps the portrait sheet separate from the scene image", async () => {
    const directory = await createTemporaryDirectory();
    const storage = new LocalImageStorage(imagesConfig(), directory);
    const scene = await new SvgImageGenerator().generate(imageRequest());
    const portraits = await new SvgImageGenerator().generate({
      ...imageRequest(), purpose: "portrait_sheet", portraitCount: 3,
    });

    const sceneFile = await storage.save(CASE_ID, scene);
    const portraitFile = await storage.save(CASE_ID, portraits, "portraits");

    expect(sceneFile.publicUrl).toBe(`/generated-images/${CASE_ID}.svg`);
    expect(portraitFile.publicUrl).toBe(`/generated-images/${CASE_ID}-portraits.svg`);
    expect(await readFile(portraitFile.filePath, "utf8")).toContain("Retratos ilustrativos dos suspeitos");
  });
});

describe("CaseImageGenerationService", () => {
  it("completes the case with one local mock image and persists metadata", async () => {
    const repository = await preparedRepository();
    const directory = await createTemporaryDirectory();
    const service = new CaseImageGenerationService(
      repository,
      new SvgImageGenerator(),
      new LocalImageStorage(imagesConfig(), directory),
      imagesConfig(),
    );

    const result = await service.generate(CASE_ID);

    expect(result).toMatchObject({
      imageUrl: `/generated-images/${CASE_ID}.svg`,
      portraitSheetUrl: `/generated-images/${CASE_ID}-portraits.svg`,
      isFallback: false,
      image: { metadata: { provider: "mock" } },
    });
    expect(repository.findStatus(CASE_ID)).toMatchObject({
      status: "ready",
      progress: 100,
    });
    expect(repository.findPublicCase(CASE_ID)?.scene.imageUrl).toBe(
      result.imageUrl,
    );
    expect(repository.findPublicCase(CASE_ID)?.portraitSheetUrl).toBe(
      result.portraitSheetUrl,
    );
    expect(repository.findImageMetadata(CASE_ID)).toMatchObject({
      provider: "mock",
      model: "mock-svg",
      isFallback: false,
      usage: { totalTokens: 0 },
    });
  });

  it("uses a local fallback and still completes when the provider fails", async () => {
    const repository = await preparedRepository();
    const directory = await createTemporaryDirectory();
    const failingGenerator: CaseImageGenerator = {
      generate: vi.fn().mockRejectedValue(new Error("provider secret")),
    };
    const service = new CaseImageGenerationService(
      repository,
      failingGenerator,
      new LocalImageStorage(imagesConfig(), directory),
      imagesConfig(),
    );

    const result = await service.generate(CASE_ID);

    expect(result.isFallback).toBe(true);
    expect(repository.findStatus(CASE_ID)?.status).toBe("ready");
    expect(repository.findImageMetadata(CASE_ID)).toMatchObject({
      provider: "fallback",
      isFallback: true,
    });
    expect(await readFile(repository.findImageMetadata(CASE_ID)!.filePath, "utf8"))
      .toContain("Imagem indisponível");
  });

  it("regenerates a scene with the judge's corrections and publishes only the approved image", async () => {
    const repository = await preparedRepository();
    const directory = await createTemporaryDirectory();
    const generate = vi.fn(async (request: Parameters<CaseImageGenerator["generate"]>[0]) => {
      const base = await new SvgImageGenerator().generate(request);
      return { ...base, bytes: Buffer.from(request.prompt), metadata: { ...base.metadata, provider: "openai" as const } };
    });
    const review = vi.fn()
      .mockResolvedValueOnce(judgeResult(majorScaleIssue()))
      .mockResolvedValueOnce(judgeResult(cleanReview()));
    const service = new CaseImageGenerationService(
      repository,
      { generate },
      new LocalImageStorage(imagesConfig(), directory),
      imagesConfig(),
      { review } as VisualJudge,
    );

    const result = await service.generate(CASE_ID);

    expect(generate).toHaveBeenCalledTimes(3);
    expect(review).toHaveBeenCalledTimes(2);
    expect(review.mock.calls[0]?.[0].imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(generate.mock.calls[2]?.[0].prompt).toContain("a pessoa é grande demais para a cama");
    expect(result.isFallback).toBe(false);
    expect(repository.findStatus(CASE_ID)?.status).toBe("ready");
    expect(await readFile(repository.findImageMetadata(CASE_ID)!.filePath, "utf8"))
      .toContain("a pessoa é grande demais para a cama");
  });

  it("publishes a neutral fallback if the second scene still has a major defect", async () => {
    const repository = await preparedRepository();
    const directory = await createTemporaryDirectory();
    const generate = vi.fn(async (request: Parameters<CaseImageGenerator["generate"]>[0]) => {
      const base = await new SvgImageGenerator().generate(request);
      return { ...base, metadata: { ...base.metadata, provider: "openai" as const } };
    });
    const review = vi.fn().mockResolvedValue(judgeResult(majorScaleIssue()));
    const service = new CaseImageGenerationService(
      repository, { generate }, new LocalImageStorage(imagesConfig(), directory),
      imagesConfig(), { review } as VisualJudge,
    );

    const result = await service.generate(CASE_ID);

    expect(review).toHaveBeenCalledTimes(2);
    expect(result.isFallback).toBe(true);
    expect(repository.findImageMetadata(CASE_ID)).toMatchObject({ provider: "fallback", isFallback: true });
    expect(repository.findStatus(CASE_ID)?.status).toBe("ready");
  });

  it("publishes a neutral fallback when the visual review service is unavailable", async () => {
    const repository = await preparedRepository();
    const directory = await createTemporaryDirectory();
    const generate = vi.fn(async (request: Parameters<CaseImageGenerator["generate"]>[0]) => {
      const base = await new SvgImageGenerator().generate(request);
      return { ...base, metadata: { ...base.metadata, provider: "openai" as const } };
    });
    const review = vi.fn().mockRejectedValue(new Error("rate limited"));
    const service = new CaseImageGenerationService(
      repository, { generate }, new LocalImageStorage(imagesConfig(), directory),
      imagesConfig(), { review } as VisualJudge,
    );

    const result = await service.generate(CASE_ID);

    expect(review).toHaveBeenCalledOnce();
    expect(result.isFallback).toBe(true);
    expect(repository.findImageMetadata(CASE_ID)).toMatchObject({ provider: "fallback", isFallback: true });
    expect(repository.findStatus(CASE_ID)?.status).toBe("ready");
  });

  it("fails the case when visual fallback is disabled and the judge is unavailable", async () => {
    const repository = await preparedRepository();
    const directory = await createTemporaryDirectory();
    const generate = vi.fn(async (request: Parameters<CaseImageGenerator["generate"]>[0]) => {
      const base = await new SvgImageGenerator().generate(request);
      return { ...base, metadata: { ...base.metadata, provider: "openai" as const } };
    });
    const review = vi.fn().mockRejectedValue(new Error("rate limited"));
    const service = new CaseImageGenerationService(
      repository, { generate }, new LocalImageStorage(imagesConfig(), directory),
      { fallback_enabled: false }, { review } as VisualJudge,
    );

    await expect(service.generate(CASE_ID)).rejects.toThrow("Não foi possível aprovar a imagem da cena.");
    expect(repository.findStatus(CASE_ID)?.status).toBe("failed");
  });

  it("fails generically when fallback is disabled", async () => {
    const repository = await preparedRepository();
    const directory = await createTemporaryDirectory();
    const failingGenerator: CaseImageGenerator = {
      generate: vi.fn().mockRejectedValue(new Error("provider secret")),
    };
    const service = new CaseImageGenerationService(
      repository,
      failingGenerator,
      new LocalImageStorage(imagesConfig(), directory),
      { fallback_enabled: false },
    );

    await expect(service.generate(CASE_ID)).rejects.toThrow("provider secret");
    expect(repository.findStatus(CASE_ID)).toMatchObject({
      status: "failed",
      errorMessage: "Não foi possível preparar a imagem do caso.",
    });
  });
});

function majorScaleIssue(): VisualReview {
  return {
    summary: "Escala incorreta.",
    issues: [{ category: "scale", severity: "major", explanation: "a pessoa é grande demais para a cama" }],
    repairInstructions: "Redimensione a pessoa em relação à cama.",
  };
}

function cleanReview(): VisualReview {
  return { summary: "Cena coerente.", issues: [], repairInstructions: "" };
}

function judgeResult(review: VisualReview) {
  return {
    review, model: "test-vision", responseId: "test-response",
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
  };
}

async function preparedRepository() {
  const opened = openDatabase({ filename: ":memory:" });
  databases.push(opened.database);
  const repository = new CaseRepository(opened.database);
  const briefing = {
    period: "victorian" as const,
    customPeriod: null,
    crimeType: "theft" as const,
    setting: "Hotel isolado nas montanhas",
    difficulty: "medium" as const,
    tone: "classic" as const,
  };
  repository.createPending({
    id: CASE_ID,
    briefing,
    createdAt: "2026-11-06T12:00:00.000Z",
  });
  repository.markGeneratingCase(CASE_ID);
  const generated = await new MockCaseGenerator().generate({
    briefing,
    suspectCount: 3,
    documentCount: 4,
  });
  repository.saveGenerationDraft(CASE_ID, generated.output, {
    provider: "mock",
    textModel: generated.metadata.model,
    responseId: null,
    promptVersion: generated.metadata.promptVersion,
    usage: generated.metadata.usage,
  });
  return repository;
}

async function createTemporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "fabrica-images-"));
  temporaryDirectories.push(directory);
  return directory;
}

function imageRequest() {
  return {
    caseId: CASE_ID,
    prompt: "Uma suíte vitoriana com um cofre aberto.",
    altText: "Suíte vitoriana com cofre aberto.",
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

function openAiImageConfig() {
  return {
    api_key: "sk-proj-fake-key-for-unit-tests-only",
    image_model: "gpt-image-2.5-flare",
    image_quality: "low" as const,
    timeout_seconds: 120,
    max_retries: 1,
    size: "1536x1024" as const,
    format: "webp" as const,
    compression: 85,
  };
}
