import { publicCaseSchema } from "@fabrica/contracts";
import { db } from "../../_shared/db.js";
import { caseIdFromRequest, error, internalError, json, methodNotAllowed } from "../../_shared/http.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return methodNotAllowed();
    const caseId = caseIdFromRequest(request);
    if (!caseId) return error(400, "invalid_request", "O identificador do caso é inválido.");
    try {
      const rows = await db()`SELECT status, error_message, public_case_json FROM cases WHERE id = ${caseId}`;
      const row = rows[0];
      if (!row) return error(404, "not_found", "Caso não encontrado.");
      if (row.status !== "ready") return error(409, "case_not_ready", row.error_message ?? "O caso ainda está sendo preparado.");
      return json(publicCaseSchema.parse(row.public_case_json));
    } catch (cause) {
      return internalError(cause);
    }
  },
};
