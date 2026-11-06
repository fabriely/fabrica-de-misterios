import type { CaseBriefing } from "@fabrica/contracts";
import type { CaseGenerationWorkflow } from "./workflow.js";

export class CaseGenerationQueue {
  private readonly jobs = new Set<Promise<void>>();

  constructor(
    private readonly workflow: CaseGenerationWorkflow,
    private readonly reportFailure: (caseId: string) => void = () => {},
  ) {}

  enqueue(caseId: string, briefing: CaseBriefing): void {
    const job = Promise.resolve()
      .then(() => this.workflow.generate(caseId, briefing))
      .catch(() => {
        this.reportFailure(caseId);
      })
      .finally(() => {
        this.jobs.delete(job);
      });

    this.jobs.add(job);
  }

  async drain(): Promise<void> {
    await Promise.all([...this.jobs]);
  }

  get size(): number {
    return this.jobs.size;
  }
}
