import { accusationOutcomeSchema } from "@fabrica/contracts";
import type { AccusationResult } from "@fabrica/contracts";

export function toAccusationOutcome(result: AccusationResult) {
  return accusationOutcomeSchema.parse({
    caseId: result.caseId,
    correct: result.correct,
    accusedName: result.accusedName,
    submittedAt: result.submittedAt,
  });
}
