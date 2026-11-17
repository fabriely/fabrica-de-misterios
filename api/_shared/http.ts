import { apiErrorResponseSchema, caseIdSchema } from "@fabrica/contracts";
import type { ApiErrorCode } from "@fabrica/contracts";

export function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export function error(status: number, code: ApiErrorCode, message: string): Response {
  return json(apiErrorResponseSchema.parse({ code, message }), status);
}

export function methodNotAllowed(): Response {
  return error(405, "invalid_request", "Método não permitido.");
}

export async function body(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export function caseIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const id = url.searchParams.get("caseId") ?? parts[3];
  const parsed = caseIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export function playerIdFromRequest(request: Request): string | null {
  const parsed = caseIdSchema.safeParse(request.headers.get("x-player-id"));
  return parsed.success ? parsed.data : null;
}

export function internalError(cause: unknown): Response {
  const status = cause !== null && typeof cause === "object" && "status" in cause
    ? cause.status
    : cause !== null && typeof cause === "object" && "statusCode" in cause
      ? cause.statusCode
      : null;
  if (status === 429) {
    return error(429, "generation_limit_reached", "A OpenAI recusou a geração (HTTP 429). Verifique créditos, faturamento e limites de uso da API; tente novamente após resolver a restrição.");
  }
  console.error("[api] Falha interna", cause instanceof Error ? cause.name : "UnknownError");
  return error(500, "internal_error", "Não foi possível concluir a solicitação.");
}
