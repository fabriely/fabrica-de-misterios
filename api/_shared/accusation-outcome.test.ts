import { describe, expect, it } from "vitest";
import { accusationResultSchema } from "@fabrica/contracts";
import { toAccusationOutcome } from "./accusation-outcome.js";

describe("toAccusationOutcome", () => {
  it("returns a saved accusation without leaking the private solution", () => {
    const result = accusationResultSchema.parse({
      caseId: "d7e85248-3a37-465b-998d-3b21aa8a3934",
      correct: false,
      accusedName: "César Falcão",
      culpritId: "suspect_1",
      culpritName: "Helena Prado",
      motive: "Precisava esconder um segredo.",
      method: "Desligou a iluminação do salão.",
      timeline: [
        { time: "21:00", event: "As luzes se apagaram." },
        { time: "21:05", event: "O corpo foi encontrado." },
      ],
      decisiveEvidenceIds: ["document_1", "visual_clue_1"],
      explanation: "As pistas contradizem o álibi.",
      submittedAt: "2026-11-08T21:00:00.000Z",
    });

    expect(toAccusationOutcome(result)).toEqual({
      caseId: result.caseId,
      correct: false,
      accusedName: "César Falcão",
      submittedAt: result.submittedAt,
    });
  });
});
