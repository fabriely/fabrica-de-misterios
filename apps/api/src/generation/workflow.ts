import type { CaseBriefing, SelectedPremise } from "@fabrica/contracts";
import type { CaseImageGenerationService } from "../image/index.js";
import type { CaseTextGenerationService } from "./service.js";

export interface CaseGenerationWorkflow {
  generate(caseId: string, briefing: CaseBriefing, premise?: SelectedPremise | null): Promise<void>;
}

export class DefaultCaseGenerationWorkflow implements CaseGenerationWorkflow {
  constructor(
    private readonly textGeneration: CaseTextGenerationService,
    private readonly imageGeneration: CaseImageGenerationService,
  ) {}

  async generate(caseId: string, briefing: CaseBriefing, premise?: SelectedPremise | null): Promise<void> {
    await this.textGeneration.generate(caseId, briefing, premise);
    await this.imageGeneration.generate(caseId);
  }
}
