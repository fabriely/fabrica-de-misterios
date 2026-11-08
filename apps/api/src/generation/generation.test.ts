import type OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CaseBriefing } from "@fabrica/contracts";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config/index.js";
import { CaseRepository, openDatabase } from "../database/index.js";
import { MockCaseGenerator } from "./mock-case-generator.js";
import { OpenAiCaseGenerator } from "./openai-case-generator.js";
import {
  buildCaseUserPrompt,
  CASE_AUTHOR_INSTRUCTIONS,
  CASE_PROMPT_VERSION,
} from "./prompts/case-v1.js";
import { CaseTextGenerationService } from "./service.js";
import type { TextCaseGenerator } from "./types.js";

const CASE_ID = "d819d84d-35d4-4e70-812a-47b8126f724b";
const databases: Database.Database[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) {
    if (database.open) database.close();
  }
});

describe("versioned case prompt", () => {
  it("keeps static rules separate from dynamic briefing data", () => {
    const prompt = buildCaseUserPrompt(validRequest());

    expect(CASE_PROMPT_VERSION).toBe("case-v1");
    expect(CASE_AUTHOR_INSTRUCTIONS).toContain(
      "Toda conclusão decisiva deve ser demonstrável",
    );
    expect(prompt).toContain('"crimeType": "theft"');
    expect(prompt).toContain("Suspeitos: 3");
    expect(prompt).toContain("Documentos: 4");
  });
});

describe("MockCaseGenerator", () => {
  it("creates a coherent case with the requested counts at zero usage", async () => {
    const generator = new MockCaseGenerator();
    const result = await generator.generate(validRequest());

    expect(result.output.publicCase.suspects).toHaveLength(3);
    expect(result.output.publicCase.documents).toHaveLength(4);
    expect(result.output.publicCase.briefing).toEqual(validBriefing());
    expect(result.metadata).toMatchObject({
      provider: "mock",
      model: "mock-case-generator",
      promptVersion: "case-v1",
      usage: { totalTokens: 0 },
    });
  });
});

describe("OpenAiCaseGenerator", () => {
  it("uses Responses structured output with configured cost controls", async () => {
    const mockResult = await new MockCaseGenerator().generate(validRequest());
    const parse = vi.fn().mockResolvedValue({
      id: "resp_test_123",
      model: "gpt-6-luna",
      status: "completed",
      output_parsed: mockResult.output,
      usage: {
        input_tokens: 500,
        output_tokens: 900,
        total_tokens: 1_400,
        output_tokens_details: { reasoning_tokens: 120 },
      },
    });
    const client = {
      responses: { parse },
    } as unknown as Pick<OpenAI, "responses">;
    const generator = new OpenAiCaseGenerator(openAiConfig(), client);

    const result = await generator.generate(validRequest());

    expect(parse).toHaveBeenCalledOnce();
    expect(parse.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-6-luna",
      reasoning: { effort: "low" },
      max_output_tokens: 8_000,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "mystery_case",
          strict: true,
        },
      },
    });
    expect(result.metadata).toEqual({
      provider: "openai",
      model: "gpt-6-luna",
      responseId: "resp_test_123",
      promptVersion: "case-v1",
      usage: {
        inputTokens: 500,
        outputTokens: 900,
        reasoningTokens: 120,
        totalTokens: 1_400,
      },
    });
  });

  it("rejects incomplete structured responses", async () => {
    const parse = vi.fn().mockResolvedValue({
      id: "resp_incomplete",
      model: "gpt-6-luna",
      status: "incomplete",
      output_parsed: null,
      usage: null,
    });
    const client = {
      responses: { parse },
    } as unknown as Pick<OpenAI, "responses">;

    await expect(
      new OpenAiCaseGenerator(openAiConfig(), client).generate(validRequest()),
    ).rejects.toThrow(/caso estruturado completo/);
  });

  it("rejects responses that change requested quantities", async () => {
    const mockResult = await new MockCaseGenerator().generate(validRequest());
    const parse = vi.fn().mockResolvedValue({
      id: "resp_wrong_count",
      model: "gpt-6-luna",
      status: "completed",
      output_parsed: {
        ...mockResult.output,
        publicCase: {
          ...mockResult.output.publicCase,
          suspects: mockResult.output.publicCase.suspects.slice(0, 2),
        },
      },
      usage: null,
    });
    const client = {
      responses: { parse },
    } as unknown as Pick<OpenAI, "responses">;

    await expect(
      new OpenAiCaseGenerator(openAiConfig(), client).generate(validRequest()),
    ).rejects.toThrow(/eram esperados 3/);
  });
});

describe("CaseTextGenerationService", () => {
  it("moves a pending case to image generation and persists the draft", async () => {
    const { repository } = createCaseRepository();
    const briefing = validBriefing();
    repository.createPending({ id: CASE_ID, briefing });
    const service = new CaseTextGenerationService(
      repository,
      new MockCaseGenerator(),
      generationConfig(),
    );

    const result = await service.generate(CASE_ID, briefing);

    expect(repository.findStatus(CASE_ID)).toMatchObject({
      status: "generating_image",
      progress: 70,
    });
    expect(repository.findGenerationDraft(CASE_ID)).toMatchObject({
      publicCase: { title: result.output.publicCase.title },
      privateSolution: { culpritId: "suspect_1" },
    });
    expect(repository.findGenerationMetadata(CASE_ID)).toEqual({
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
  });

  it("marks the case as failed without persisting provider details", async () => {
    const { repository } = createCaseRepository();
    const briefing = validBriefing();
    repository.createPending({ id: CASE_ID, briefing });
    const failingGenerator: TextCaseGenerator = {
      generate: vi.fn().mockRejectedValue(new Error("sensitive provider error")),
    };
    const service = new CaseTextGenerationService(
      repository,
      failingGenerator,
      generationConfig(),
    );

    await expect(service.generate(CASE_ID, briefing)).rejects.toThrow(
      "sensitive provider error",
    );
    expect(repository.findStatus(CASE_ID)).toMatchObject({
      status: "failed",
      errorMessage: "Não foi possível gerar o caso textual.",
    });
  });
});

function createCaseRepository() {
  const opened = openDatabase({ filename: ":memory:" });
  databases.push(opened.database);
  return { repository: new CaseRepository(opened.database) };
}

function validRequest() {
  return {
    briefing: validBriefing(),
    suspectCount: 3,
    documentCount: 4,
  };
}

function validBriefing(): CaseBriefing {
  return {
    period: "victorian",
    customPeriod: null,
    crimeType: "theft",
    setting: "Hotel isolado nas montanhas",
    difficulty: "medium",
    tone: "classic",
  };
}

function openAiConfig(): AppConfig["openai"] {
  return {
    api_key: "sk-proj-fake-key-for-unit-tests-only",
    text_model: "gpt-6-luna",
    image_model: "gpt-image-2.5-flare",
    reasoning_effort: "low",
    image_quality: "low",
    timeout_seconds: 120,
    max_retries: 1,
    max_output_tokens: 8_000,
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
