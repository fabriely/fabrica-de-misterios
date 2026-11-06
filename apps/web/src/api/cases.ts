import {
  API_PATHS,
  apiErrorResponseSchema,
  accusationOutcomeSchema,
  accusationResultSchema,
  caseStatusResponseSchema,
  createCaseRequestSchema,
  publicCaseSchema,
  submitAccusationRequestSchema,
} from "@fabrica/contracts";
import type {
  CaseStatusResponse,
  AccusationOutcome,
  AccusationResult,
  CreateCaseRequest,
  SubmitAccusationRequest,
  PublicCase,
} from "@fabrica/contracts";

export class PublicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

export async function createCase(
  request: CreateCaseRequest,
  signal?: AbortSignal,
): Promise<CaseStatusResponse> {
  const payload = createCaseRequestSchema.parse(request);
  const response = await fetch(API_PATHS.cases, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: signal ?? null,
  });
  return parseStatusResponse(response);
}

export async function waitForCase(
  caseId: string,
  onStatus: (status: CaseStatusResponse) => void,
  options: { signal?: AbortSignal; intervalMs?: number } = {},
): Promise<CaseStatusResponse> {
  const intervalMs = options.intervalMs ?? 1_000;

  while (true) {
    await delay(intervalMs, options.signal);
    const response = await fetch(API_PATHS.caseStatus(caseId), {
      signal: options.signal ?? null,
    });
    const status = await parseStatusResponse(response);
    onStatus(status);

    if (status.status === "ready") return status;
    if (status.status === "failed") {
      throw new PublicApiError(
        status.errorMessage ?? "Não foi possível gerar o caso.",
        500,
      );
    }
  }
}

export async function getCase(
  caseId: string,
  signal?: AbortSignal,
): Promise<PublicCase> {
  const response = await fetch(API_PATHS.case(caseId), {
    signal: signal ?? null,
  });
  const body = await parseApiBody(response);
  return publicCaseSchema.parse(body);
}

export async function getAccusation(
  caseId: string,
  signal?: AbortSignal,
): Promise<AccusationOutcome | null> {
  const response = await fetch(API_PATHS.accusation(caseId), {
    signal: signal ?? null,
  });
  if (response.status === 404) return null;
  const body = await parseApiBody(response);
  return accusationOutcomeSchema.parse(body);
}

export async function submitAccusation(
  caseId: string,
  request: SubmitAccusationRequest,
  signal?: AbortSignal,
): Promise<AccusationOutcome> {
  const payload = submitAccusationRequestSchema.parse(request);
  const response = await fetch(API_PATHS.accusation(caseId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: signal ?? null,
  });
  const body = await parseApiBody(response);
  return accusationOutcomeSchema.parse(body);
}

export async function getReveal(
  caseId: string,
  signal?: AbortSignal,
): Promise<AccusationResult> {
  const response = await fetch(API_PATHS.reveal(caseId), {
    signal: signal ?? null,
  });
  const body = await parseApiBody(response);
  return accusationResultSchema.parse(body);
}

async function parseStatusResponse(response: Response) {
  const body = await parseApiBody(response);
  return caseStatusResponseSchema.parse(body);
}

async function parseApiBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = apiErrorResponseSchema.safeParse(body);
    throw new PublicApiError(
      error.success
        ? error.data.message
        : "A API não conseguiu atender à solicitação.",
      response.status,
    );
  }
  return body;
}

function delay(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timeout = globalThis.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        globalThis.clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
