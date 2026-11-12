import type { CaseBriefing, SelectedPremise } from "@fabrica/contracts";
import type { CaseGenerationWorkflow } from "./workflow.js";

type QueuedGeneration = {
  caseId: string;
  briefing: CaseBriefing;
  premise?: SelectedPremise | null;
};

export class CaseGenerationQueue {
  private readonly pending: QueuedGeneration[] = [];
  private readonly idleWaiters = new Set<() => void>();
  private activeJobs = 0;

  constructor(
    private readonly workflow: CaseGenerationWorkflow,
    private readonly reportFailure: (caseId: string) => void = () => {},
    private readonly maxConcurrency = 1,
  ) {
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new Error("A concorrência da fila deve ser um inteiro positivo.");
    }
  }

  enqueue(caseId: string, briefing: CaseBriefing, premise?: SelectedPremise | null): void {
    this.pending.push({ caseId, briefing, premise: premise ?? null });
    this.pump();
  }

  async drain(): Promise<void> {
    if (this.size === 0) return;
    await new Promise<void>((resolve) => this.idleWaiters.add(resolve));
  }

  get size(): number {
    return this.pending.length + this.activeJobs;
  }

  get active(): number {
    return this.activeJobs;
  }

  private pump() {
    while (
      this.activeJobs < this.maxConcurrency &&
      this.pending.length > 0
    ) {
      const generation = this.pending.shift()!;
      this.activeJobs += 1;
      void Promise.resolve()
        .then(() =>
          this.workflow.generate(generation.caseId, generation.briefing, generation.premise),
        )
        .catch(() => {
          try {
            this.reportFailure(generation.caseId);
          } catch {
            // A reporting failure must never stall the remaining queue.
          }
        })
        .finally(() => {
          this.activeJobs -= 1;
          this.pump();
          this.resolveIdleWaiters();
        });
    }
  }

  private resolveIdleWaiters() {
    if (this.size > 0) return;
    for (const resolve of this.idleWaiters) resolve();
    this.idleWaiters.clear();
  }
}
