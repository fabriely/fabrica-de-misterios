import { caseGenerationOutputSchema } from "@fabrica/contracts";
import type { CaseGenerationOutput } from "@fabrica/contracts";
import { CaseGenerationProviderError } from "./errors.js";
import type { CaseGenerationRequest } from "./types.js";

export function validateGeneratedCase(
  outputInput: unknown,
  request: CaseGenerationRequest,
): CaseGenerationOutput {
  const output = caseGenerationOutputSchema.parse(outputInput);

  if (output.publicCase.suspects.length !== request.suspectCount) {
    throw new CaseGenerationProviderError(
      `O provedor retornou ${output.publicCase.suspects.length} suspeitos; eram esperados ${request.suspectCount}.`,
    );
  }

  if (output.publicCase.documents.length !== request.documentCount) {
    throw new CaseGenerationProviderError(
      `O provedor retornou ${output.publicCase.documents.length} documentos; eram esperados ${request.documentCount}.`,
    );
  }

  if (
    JSON.stringify(output.publicCase.briefing) !==
    JSON.stringify(request.briefing)
  ) {
    throw new CaseGenerationProviderError(
      "O provedor alterou o briefing solicitado.",
    );
  }

  return output;
}
