import { randomUUID } from "node:crypto";
import {
  accusationOutcomeSchema,
  accusationResultSchema,
  submitAccusationRequestSchema,
} from "@fabrica/contracts";
import type {
  AccusationOutcome,
  SubmitAccusationRequest,
} from "@fabrica/contracts";
import {
  AccusationAlreadyExistsError,
  InvalidAccusationSuspectError,
} from "../database/index.js";
import type {
  AccusationRepository,
  CaseRepository,
} from "../database/index.js";

export class AccusationService {
  constructor(
    private readonly cases: CaseRepository,
    private readonly accusations: AccusationRepository,
  ) {}

  submit(
    caseId: string,
    playerId: string,
    requestInput: SubmitAccusationRequest,
  ): AccusationOutcome {
    if (this.accusations.findByCaseId(caseId, playerId)) {
      throw new AccusationAlreadyExistsError(caseId);
    }

    const request = submitAccusationRequestSchema.parse(requestInput);
    const bundle = this.cases.findBundleForAccusation(caseId);
    if (!bundle) {
      throw new Error("O caso não está pronto para receber uma acusação.");
    }

    const normalizedInput = request.suspectName ? normalizeSuspectName(request.suspectName) : null;
    const matches = bundle.publicCase.suspects.filter(
      (suspect) => request.suspectId ? suspect.id === request.suspectId : normalizeSuspectName(suspect.name) === normalizedInput,
    );
    if (matches.length !== 1) throw new InvalidAccusationSuspectError();

    const accused = matches[0]!;
    const culprit = bundle.publicCase.suspects.find(
      (suspect) => suspect.id === bundle.privateSolution.culpritId,
    );
    if (!culprit) throw new Error("O culpado privado não existe no caso público.");

    const submittedAt = new Date().toISOString();
    const correct = accused.id === culprit.id;
    const result = accusationResultSchema.parse({
      caseId,
      correct,
      accusedName: accused.name,
      culpritId: culprit.id,
      culpritName: culprit.name,
      motive: bundle.privateSolution.motive,
      method: bundle.privateSolution.method,
      timeline: bundle.privateSolution.timeline,
      decisiveEvidenceIds: bundle.privateSolution.decisiveEvidenceIds,
      explanation: bundle.privateSolution.explanation,
      submittedAt,
    });

    const stored = this.accusations.submit(
      {
        id: `accusation_${randomUUID().replaceAll("-", "")}`,
        caseId,
        playerId,
        suspectName: accused.name,
        normalizedSuspectName: normalizeSuspectName(accused.name),
        submittedAt,
        correct,
      },
      result,
    );

    return toOutcome(stored.result);
  }

  findOutcome(caseId: string, playerId: string): AccusationOutcome | null {
    const stored = this.accusations.findByCaseId(caseId, playerId);
    return stored ? toOutcome(stored.result) : null;
  }

  findReveal(caseId: string, playerId: string) {
    return this.accusations.findByCaseId(caseId, playerId)?.result ?? null;
  }
}

export function normalizeSuspectName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function toOutcome(result: {
  caseId: string;
  correct: boolean;
  accusedName: string;
  submittedAt: string;
}) {
  return accusationOutcomeSchema.parse({
    caseId: result.caseId,
    correct: result.correct,
    accusedName: result.accusedName,
    submittedAt: result.submittedAt,
  });
}
