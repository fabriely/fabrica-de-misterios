import {
  API_PATHS,
  apiErrorResponseSchema,
  caseStatusResponseSchema,
  createCaseRequestSchema,
} from "@fabrica/contracts";
import type {
  CaseStatusResponse,
  CreateCaseRequest,
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

async function parseStatusResponse(response: Response) {
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
  return caseStatusResponseSchema.parse(body);
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
