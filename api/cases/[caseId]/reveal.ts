import { accusationResultSchema } from "@fabrica/contracts";
import { db } from "../../_shared/db.js";
import { caseIdFromRequest, error, internalError, json, methodNotAllowed, playerIdFromRequest } from "../../_shared/http.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") return methodNotAllowed();
    const caseId = caseIdFromRequest(request);
    const playerId = playerIdFromRequest(request);
    if (!caseId || !playerId) return error(400, "invalid_request", "Identificação do caso ou jogador inválida.");
    try {
      const sql = db();
      const rows = await sql`SELECT result_json FROM accusations WHERE case_id = ${caseId} AND player_id = ${playerId}`;
      if (!rows[0]) return error(403, "accusation_required", "A solução só pode ser revelada depois da sua acusação.");
      return json(accusationResultSchema.parse(rows[0].result_json));
    } catch (cause) {
      return internalError(cause);
    }
  },
};
