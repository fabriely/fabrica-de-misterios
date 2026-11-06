import type { CaseBriefing } from "@fabrica/contracts";
import type { CaseImageGenerationService } from "../image/index.js";
import type { CaseTextGenerationService } from "./service.js";

export interface CaseGenerationWorkflow {
  generate(caseId: string, briefing: CaseBriefing): Promise<void>;
}

export class DefaultCaseGenerationWorkflow implements CaseGenerationWorkflow {
  constructor(
    private readonly textGeneration: CaseTextGenerationService,
    private readonly imageGeneration: CaseImageGenerationService,
  ) {}

  async generate(caseId: string, briefing: CaseBriefing): Promise<void> {
    await this.textGeneration.generate(caseId, briefing);
    await this.imageGeneration.generate(caseId);
  }
}
