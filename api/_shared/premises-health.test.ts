import { describe, expect, it } from "vitest";
import premises from "../premises.js";

describe("health routed through premises", () => {
  it("answers GET without calling generation", async () => {
    const response = await premises.fetch(new Request("https://example.test/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", service: "fabrica-api", version: "0.2.0" });
  });
});
