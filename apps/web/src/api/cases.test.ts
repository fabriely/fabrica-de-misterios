import { afterEach, describe, expect, it, vi } from "vitest";
import { createCase, PublicApiError, waitForCase } from "./cases";

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
