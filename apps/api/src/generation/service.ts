import type { CaseBriefing } from "@fabrica/contracts";
import type { AppConfig } from "../config/index.js";
import type { CaseRepository } from "../database/index.js";
import type { CaseGenerationResult, TextCaseGenerator } from "./types.js";

export class CaseTextGenerationService {
  constructor(
    private readonly cases: CaseRepository,
    private readonly generator: TextCaseGenerator,
    private readonly generationConfig: AppConfig["generation"],
  ) {}

  async generate(
    caseId: string,
    briefing: CaseBriefing,
  ): Promise<CaseGenerationResult> {
    this.cases.markGeneratingCase(caseId);

    try {
      const result = await this.generator.generate({
        briefing,
        suspectCount: this.generationConfig.suspect_count,
        documentCount: this.generationConfig.document_count,
      });

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
