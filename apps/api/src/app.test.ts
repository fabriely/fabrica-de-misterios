import { afterEach, describe, expect, it } from "vitest";
import { API_PATHS } from "@fabrica/contracts/health";
import { buildApp } from "./app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("GET /api/health", () => {
  it("reports that the API is healthy", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: API_PATHS.health,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "fabrica-api",
      version: "0.1.0",
    });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("returns standardized errors for unknown routes and invalid JSON", async () => {
    const app = buildApp();
    apps.push(app);

    const missing = await app.inject({ method: "GET", url: "/unknown" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({
      code: "not_found",
      message: "Rota não encontrada.",
    });

    const malformed = await app.inject({
      method: "POST",
      url: "/api/cases",
      headers: { "content-type": "application/json" },
      payload: "{invalid",
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({
      code: "invalid_request",
      message: "O corpo da requisição é inválido.",
    });
  });

  it("explains an upstream HTTP 429 without exposing provider internals", async () => {
    const app = buildApp();
    app.get("/openai-limited", async () => {
      const problem = new Error("upstream sensitive diagnostics") as Error & { status: number };
      problem.status = 429;
      throw problem;
    });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/openai-limited" });
    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({ code: "generation_limit_reached" });
    expect(response.body).toContain("créditos");
    expect(response.body).not.toContain("upstream sensitive diagnostics");
  });

  it("hides unexpected error details and rejects oversized bodies", async () => {
    const app = buildApp({ bodyLimitBytes: 64 });
    app.get("/explode", async () => {
      throw new Error("sensitive internal detail");
    });
    apps.push(app);

    const failure = await app.inject({ method: "GET", url: "/explode" });
    expect(failure.statusCode).toBe(500);
    expect(failure.json()).toEqual({
      code: "internal_error",
      message: "Não foi possível concluir a solicitação.",
    });
    expect(failure.body).not.toContain("sensitive internal detail");

    const oversized = await app.inject({
      method: "POST",
      url: "/api/cases",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ value: "x".repeat(100) }),
    });
    expect(oversized.statusCode).toBe(413);
    expect(oversized.json()).toMatchObject({ code: "invalid_request" });
  });
});
