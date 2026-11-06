import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCase,
  getAccusation,
  getCase,
  PublicApiError,
  submitAccusation,
  waitForCase,
} from "./cases";

const CASE_ID = "d819d84d-35d4-4e70-812a-47b8126f724b";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cases API client", () => {
  it("creates a case with the validated briefing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(202, {
        caseId: CASE_ID,
        status: "queued",
        progress: 0,
        errorMessage: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCase(validRequest());

    expect(result.status).toBe("queued");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cases",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(validRequest()),
      }),
    );
  });

  it("polls until the case is ready", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          caseId: CASE_ID,
          status: "generating_image",
          progress: 70,
          errorMessage: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          caseId: CASE_ID,
          status: "ready",
          progress: 100,
          errorMessage: null,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const updates = vi.fn();

    const result = await waitForCase(CASE_ID, updates, { intervalMs: 0 });

    expect(result.status).toBe("ready");
    expect(updates).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves safe public error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          code: "invalid_request",
          message: "Os dados para criar o caso são inválidos.",
        }),
      ),
    );

    const error = await createCase(validRequest()).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PublicApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "Os dados para criar o caso são inválidos.",
    });
  });

  it("loads and validates the public dossier without private fields", async () => {
    const dossier = validPublicCase();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, dossier));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCase(CASE_ID);

    expect(result).toEqual(dossier);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/cases/${CASE_ID}`,
      { signal: null },
    );
    expect(JSON.stringify(result)).not.toContain("culpritId");
  });

  it("submits and reloads only the minimal accusation outcome", async () => {
    const outcome = {
      caseId: CASE_ID,
      correct: false,
      accusedName: "Otávio Leme",
      submittedAt: "2026-11-06T19:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, outcome))
      .mockResolvedValueOnce(jsonResponse(200, outcome));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitAccusation(CASE_ID, { suspectName: "Otávio Leme" }),
    ).resolves.toEqual(outcome);
    await expect(getAccusation(CASE_ID)).resolves.toEqual(outcome);

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ suspectName: "Otávio Leme" }),
    });
    expect(JSON.stringify(outcome)).not.toContain("culpritId");
  });

  it("treats a missing accusation as an unused chance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(404, {
          code: "not_found",
          message: "Nenhuma acusação foi registrada para este caso.",
        }),
      ),
    );

    await expect(getAccusation(CASE_ID)).resolves.toBeNull();
  });
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validRequest() {
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

function validPublicCase() {
  return {
    id: CASE_ID,
    createdAt: "2026-11-06T18:19:10.475Z",
    briefing: validRequest().briefing,
    title: "O segredo das 21h10",
    synopsis: "Uma morte suspeita foi descoberta.",
    incident: "O incidente ocorreu entre 21h e 21h20.",
    suspects: [
      {
        id: "suspect_1",
        name: "Helena Prado",
        role: "Responsável pelas chaves",
        description: "Ligada aos acontecimentos daquela noite.",
        relationshipToCase: "Controlava o acesso à área.",
        alibi: "Afirma ter permanecido no corredor norte.",
      },
      {
        id: "suspect_2",
        name: "Otávio Leme",
        role: "Testemunha",
        description: "Estava presente naquela noite.",
        relationshipToCase: "Esteve no local durante o incidente.",
        alibi: "Afirma ter permanecido na biblioteca.",
      },
    ],
    documents: [
      {
        id: "document_1",
        title: "Registro de acesso",
        type: "access_log" as const,
        summary: "Uma entrada contradiz um álibi.",
        content: "21:08 — credencial utilizada.",
      },
    ],
    scene: {
      description: "Uma porta entreaberta e um relógio parado.",
      imageAlt: "Cena com uma porta e um relógio.",
      imageUrl: `/generated-images/${CASE_ID}.svg`,
      visibleClues: [
        {
          id: "visual_clue_1",
          label: "Relógio parado",
          description: "O relógio parou às 21h10.",
        },
      ],
    },
    investigationInstructions: "Compare horários e álibis antes de acusar.",
  };
}
