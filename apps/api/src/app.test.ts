import { afterEach, describe, expect, it } from "vitest";
import { API_PATHS } from "@fabrica/contracts";
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
  });
});
