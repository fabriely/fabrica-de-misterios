import { randomUUID } from "node:crypto";
import {
  accusationResultSchema,
  caseBundleSchema,
  submitAccusationRequestSchema,
} from "@fabrica/contracts";
import { toAccusationOutcome } from "../../_shared/accusation-outcome.js";
import { db } from "../../_shared/db.js";
import { body, caseIdFromRequest, error, internalError, json, playerIdFromRequest } from "../../_shared/http.js";

export default {
  async fetch(request: Request) {
    if (request.method !== "GET" && request.method !== "POST") {
      return error(405, "invalid_request", "Método não permitido.");
    }
    const caseId = caseIdFromRequest(request);
    const playerId = playerIdFromRequest(request);
    if (!caseId || !playerId) return error(400, "invalid_request", "Identificação do caso ou jogador inválida.");
    try {
      const sql = db();
      if (request.method === "GET") {
        const rows = await sql`SELECT result_json FROM accusations WHERE case_id = ${caseId} AND player_id = ${playerId}`;
        if (!rows[0]) return error(404, "not_found", "Nenhuma acusação foi registrada para este caso.");
        return json(toAccusationOutcome(accusationResultSchema.parse(rows[0].result_json)));
      }

      const parsed = submitAccusationRequestSchema.safeParse(await body(request));
      if (!parsed.success) return error(400, "invalid_request", "Escolha um nome válido antes de acusar.");
      const rows = await sql`SELECT status, public_case_json, private_solution_json FROM cases WHERE id = ${caseId}`;
      const row = rows[0];
      if (!row) return error(404, "not_found", "Caso não encontrado.");
      if (row.status !== "ready") return error(409, "case_not_ready", "O caso ainda não está pronto para uma acusação.");
      const bundle = caseBundleSchema.parse({ publicCase: row.public_case_json, privateSolution: row.private_solution_json });
      const normalized = normalizeSuspectName(parsed.data.suspectName);
      const matches = bundle.publicCase.suspects.filter((suspect) => normalizeSuspectName(suspect.name) === normalized);
      if (matches.length !== 1) return error(400, "invalid_request", "O nome acusado não corresponde a um suspeito deste caso.");
      const accused = matches[0]!;
      const culprit = bundle.publicCase.suspects.find((suspect) => suspect.id === bundle.privateSolution.culpritId)!;
      const submittedAt = new Date().toISOString();
      const result = accusationResultSchema.parse({
        caseId,
        correct: accused.id === culprit.id,
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
      const inserted = await sql`INSERT INTO accusations (id, case_id, player_id, suspect_name, correct, result_json, submitted_at)
        VALUES (${randomUUID()}, ${caseId}, ${playerId}, ${accused.name}, ${result.correct}, ${JSON.stringify(result)}::jsonb, ${submittedAt})
        ON CONFLICT (case_id, player_id) DO NOTHING RETURNING id`;
      if (!inserted[0]) return error(409, "accusation_already_submitted", "Você já fez sua única acusação para este caso.");
      return json(toAccusationOutcome(result), 201);
    } catch (cause) {
      return internalError(cause);
    }
  },
};

function normalizeSuspectName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}
