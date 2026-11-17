import type { CaseBriefing, SelectedPremise } from "@fabrica/contracts";
import type { AppConfig } from "../config/index.js";
import type { CaseRepository } from "../database/index.js";
import type { CaseGenerationResult, TextCaseGenerator } from "./types.js";
import { measured } from "../ai/monitoring.js";
import type { Meter } from "../ai/monitoring.js";

export class CaseTextGenerationService {
  constructor(
    private readonly cases: CaseRepository,
    private readonly generator: TextCaseGenerator,
    private readonly generationConfig: AppConfig["generation"],
    private readonly meter?: Meter,
  ) {}

  async generate(
    caseId: string,
    briefing: CaseBriefing,
    premise?: SelectedPremise | null,
  ): Promise<CaseGenerationResult> {
    this.cases.markGeneratingCase(caseId);

    try {
      const result = await measured(this.meter, "case_text", {caseId}, () => this.generator.generate({
        briefing,
        premise: premise ?? null,
        suspectCount: this.generationConfig.suspect_count,
        documentCount: this.generationConfig.document_count,
      }), (value) => ({ provider: value?.metadata.provider ?? this.generationConfig.provider,
        model: value?.metadata.model ?? "unknown", usage: value?.metadata.usage }));

      this.cases.saveGenerationDraft(caseId, result.output, {
        provider: result.metadata.provider,
        textModel: result.metadata.model,
        responseId: result.metadata.responseId,
        promptVersion: result.metadata.promptVersion,
        usage: result.metadata.usage,
      });

      return result;
    } catch (error) {
      this.cases.fail(caseId, "Não foi possível gerar o caso textual.");
      throw error;
    }
  }
}
