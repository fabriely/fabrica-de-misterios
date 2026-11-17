import { randomUUID } from "node:crypto";
import { send } from "@vercel/queue";
import { createCaseRequestSchema, premiseSetSchema, caseStatusResponseSchema } from "@fabrica/contracts";
import { db } from "../_shared/db.js";
import { linkPremiseOperations } from "../_shared/observability.js";
import { body, error, internalError, json, methodNotAllowed } from "../_shared/http.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return methodNotAllowed();
    const parsed = createCaseRequestSchema.safeParse(await body(request));
    if (!parsed.success) return error(400, "invalid_request", "A premissa escolhida é inválida.");
    try {
      const sql = db();
      const rows = await sql`SELECT id, briefing_json, options_json FROM premise_sets WHERE id = ${parsed.data.premiseSetId}`;
      if (!rows[0]) return error(404, "not_found", "As premissas escolhidas não foram encontradas.");
      const set = premiseSetSchema.parse({ id: rows[0].id, briefing: rows[0].briefing_json, options: rows[0].options_json });
      const premise = set.options.find((option) => option.id === parsed.data.premiseId);
      if (!premise) return error(404, "not_found", "A premissa escolhida não foi encontrada.");
      const count = await sql`SELECT COUNT(*)::int AS total FROM cases WHERE created_at >= NOW() - INTERVAL '1 hour'`;
      if (Number(count[0]?.total ?? 0) >= 5) return error(429, "generation_limit_reached", "O limite de novos casos desta hora foi atingido.");
      const caseId = randomUUID();
      await sql`INSERT INTO cases (id, status, progress, briefing_json, selected_premise_json) VALUES (${caseId}, 'queued', 0, ${JSON.stringify(set.briefing)}::jsonb, ${JSON.stringify(premise)}::jsonb)`;
      try {
        await linkPremiseOperations(caseId,parsed.data.premiseSetId);
        await send("case-text", { caseId });
      } catch (cause) {
        await sql`UPDATE cases SET status = 'failed', error_message = 'Não foi possível iniciar a geração.', updated_at = NOW() WHERE id = ${caseId}`;
        throw cause;
      }
      return json(caseStatusResponseSchema.parse({ caseId, status: "queued", progress: 0, errorMessage: null }), 202);
    } catch (cause) {
      return internalError(cause);
    }
  },
};
