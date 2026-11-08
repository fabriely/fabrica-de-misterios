import { caseStatusResponseSchema } from "@fabrica/contracts";
import { db } from "../../_shared/db.js";
import { caseIdFromRequest, error, internalError, json, methodNotAllowed } from "../../_shared/http.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return methodNotAllowed();
    const caseId = caseIdFromRequest(request);
    if (!caseId) return error(400, "invalid_request", "O identificador do caso é inválido.");
    try {
      const rows = await db()`SELECT id, status, progress, error_message FROM cases WHERE id = ${caseId}`;
      const row = rows[0];
      if (!row) return error(404, "not_found", "Caso não encontrado.");
      return json(caseStatusResponseSchema.parse({ caseId: row.id, status: row.status, progress: row.progress, errorMessage: row.error_message }));
    } catch (cause) {
      return internalError(cause);
    }
  },
};
