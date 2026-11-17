import { caseIdSchema } from "@fabrica/contracts";

const STORAGE_KEY = "fabrica-de-misterios-cases";

export type SavedCase = {
  caseId: string;
  savedAt: string;
  premiseTitle: string | null;
};

export function readSavedCases(): SavedCase[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is SavedCase => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Record<string, unknown>;
      if (!caseIdSchema.safeParse(entry.caseId).success || seen.has(String(entry.caseId))) return false;
      if (typeof entry.savedAt !== "string" || Number.isNaN(Date.parse(entry.savedAt))) return false;
      if (entry.premiseTitle !== null && typeof entry.premiseTitle !== "string") return false;
      seen.add(String(entry.caseId));
      return true;
    });
  } catch {
    return [];
  }
}

export function saveCase(caseId: string, premiseTitle: string | null = null): boolean {
  if (!caseIdSchema.safeParse(caseId).success) return false;
  try {
    const existing = readSavedCases();
    const previous = existing.find((item) => item.caseId === caseId);
    const entry: SavedCase = {
      caseId,
      savedAt: previous?.savedAt ?? new Date().toISOString(),
      premiseTitle: premiseTitle ?? previous?.premiseTitle ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...existing.filter((item) => item.caseId !== caseId)]));
    return true;
  } catch {
    return false;
  }
}

export function caseIdFromInput(input: string): string | null {
  const value = input.trim();
  if (caseIdSchema.safeParse(value).success) return value;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/cases\/([0-9a-f-]{36})\/?$/i);
    return match?.[1] && caseIdSchema.safeParse(match[1]).success ? match[1] : null;
  } catch {
    return null;
  }
}
