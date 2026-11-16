import { describe, expect, it } from "vitest";
import type { CaseBriefing, Suspect } from "@fabrica/contracts";
import { portraitSheetRequest } from "./portrait-sheet.js";

const briefing: CaseBriefing = {
  period: "victorian",
  customPeriod: null,
  crimeType: "theft",
  setting: "Hotel isolado",
  difficulty: "medium",
  tone: "classic",
};
const suspects: Suspect[] = ["Helena Prado", "Otávio Leme", "Clara Vidal"].map((name, index) => ({
  id: `suspect_${index + 1}`,
  name,
  role: `Papel ${index + 1}`,
  description: `Descrição pública ${index + 1}.`,
  relationshipToCase: "Estava no hotel.",
  alibi: "Afirma que estava no salão.",
}));

describe("portraitSheetRequest", () => {
  it("puts each public suspect in one ordered, neutral portrait panel", () => {
    const request = portraitSheetRequest("d819d84d-35d4-4e70-812a-47b8126f724b", briefing, suspects);

    expect(request.purpose).toBe("portrait_sheet");
    expect(request.portraitCount).toBe(3);
    expect(request.prompt.indexOf("Helena Prado")).toBeLessThan(request.prompt.indexOf("Otávio Leme"));
    expect(request.prompt.indexOf("Otávio Leme")).toBeLessThan(request.prompt.indexOf("Clara Vidal"));
    expect(request.prompt).toContain("nenhum retrato deve sugerir quem é culpado");
  });
});
