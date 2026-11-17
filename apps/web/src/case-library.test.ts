import { afterEach, describe, expect, it, vi } from "vitest";
import { caseIdFromInput, readSavedCases, saveCase } from "./case-library";

const CASE_A = "d7e85248-3a37-465b-998d-3b21aa8a3934";
const CASE_B = "29eab780-ad3c-4e21-bced-4ae7772cc279";

afterEach(() => vi.unstubAllGlobals());

describe("case library", () => {
  it("keeps each opened case once and preserves its original title", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    expect(saveCase(CASE_A, "A última canção")).toBe(true);
    expect(saveCase(CASE_B)).toBe(true);
    expect(saveCase(CASE_A)).toBe(true);

    expect(readSavedCases()).toMatchObject([
      { caseId: CASE_A, premiseTitle: "A última canção" },
      { caseId: CASE_B, premiseTitle: null },
    ]);
  });

  it("accepts an old case link but rejects unrelated paths", () => {
    expect(caseIdFromInput(`https://fabrica-de-misterios.vercel.app/cases/${CASE_A}`)).toBe(CASE_A);
    expect(caseIdFromInput(CASE_B)).toBe(CASE_B);
    expect(caseIdFromInput(`https://example.com/admin/${CASE_A}`)).toBeNull();
  });

  it("ignores corrupt saved data without breaking the archive", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    storage.setItem("fabrica-de-misterios-cases", "not json");
    expect(readSavedCases()).toEqual([]);
  });
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}
