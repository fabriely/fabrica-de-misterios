import { describe, expect, it, vi } from "vitest";
import type { CaseBriefing } from "@fabrica/contracts";
import { CaseGenerationQueue } from "./queue.js";
import type { CaseGenerationWorkflow } from "./workflow.js";

describe("CaseGenerationQueue", () => {
  it("never exceeds its configured generation concurrency", async () => {
    let active = 0;
    let highestActive = 0;
    const workflow: CaseGenerationWorkflow = {
      generate: vi.fn().mockImplementation(async () => {
        active += 1;
        highestActive = Math.max(highestActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
      }),
    };
    const queue = new CaseGenerationQueue(workflow, undefined, 2);

    for (let index = 0; index < 6; index += 1) {
      queue.enqueue(`case_${index}`, briefing());
    }
    await queue.drain();

    expect(workflow.generate).toHaveBeenCalledTimes(6);
    expect(highestActive).toBe(2);
    expect(queue.size).toBe(0);
  });

  it("continues processing after a provider failure", async () => {
    const reportFailure = vi.fn();
    const workflow: CaseGenerationWorkflow = {
      generate: vi
        .fn()
        .mockRejectedValueOnce(new Error("sensitive provider failure"))
        .mockResolvedValueOnce(undefined),
    };
    const queue = new CaseGenerationQueue(workflow, reportFailure, 1);

    queue.enqueue("failed_case", briefing());
    queue.enqueue("successful_case", briefing());
    await queue.drain();

    expect(reportFailure).toHaveBeenCalledWith("failed_case");
    expect(workflow.generate).toHaveBeenCalledTimes(2);
  });
});

function briefing(): CaseBriefing {
  return {
    period: "victorian",
    customPeriod: null,
    crimeType: "theft",
    setting: "Hotel isolado",
    difficulty: "medium",
    tone: "classic",
  };
}
