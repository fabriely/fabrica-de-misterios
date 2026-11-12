import { randomUUID } from "node:crypto";
import { createPremisesRequestSchema, premiseSetSchema } from "@fabrica/contracts";
import { db } from "./_shared/db.js";
import { generatePremises } from "./_shared/generation.js";
import { body, error, internalError, json, methodNotAllowed } from "./_shared/http.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return methodNotAllowed();
    const parsed = createPremisesRequestSchema.safeParse(await body(request));
    if (!parsed.success) return error(400, "invalid_request", "O briefing para criar as premissas é inválido.");
    try {
      const sql = db();
      const count = await sql`SELECT COUNT(*)::int AS total FROM premise_sets WHERE created_at >= NOW() - INTERVAL '1 hour'`;
      if (Number(count[0]?.total ?? 0) >= 15) {
        return error(429, "generation_limit_reached", "O limite de premissas desta hora foi atingido.");
      }
      const options = await generatePremises(parsed.data.briefing);
      const set = premiseSetSchema.parse({ id: randomUUID(), briefing: parsed.data.briefing, options });
      await sql`INSERT INTO premise_sets (id, briefing_json, options_json) VALUES (${set.id}, ${JSON.stringify(set.briefing)}::jsonb, ${JSON.stringify(set.options)}::jsonb)`;
      return json(set, 201);
    } catch (cause) {
      return internalError(cause);
    }
  },
};
