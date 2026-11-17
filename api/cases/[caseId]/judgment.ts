import { db } from "../../_shared/db.js";
import { findJudgment } from "../../_shared/observability.js";
import { executeJudgment } from "../../_shared/judgment.js";
import { caseIdFromRequest, error, internalError, json, playerIdFromRequest } from "../../_shared/http.js";
export default {async fetch(request:Request) {
  if(!["GET","POST"].includes(request.method)) return error(405,"invalid_request","Método não permitido.");
  const caseId=caseIdFromRequest(request); const playerId=playerIdFromRequest(request);
  if(!caseId||!playerId) return error(400,"invalid_request","Identificação inválida.");
  try {
    const sql=db(); const acc=await sql`SELECT id FROM accusations WHERE case_id=${caseId} AND player_id=${playerId}`;
    if(!acc[0]) return error(403,"accusation_required","Registre uma acusação antes de solicitar o julgamento.");
    const judgment=request.method==="POST" ? await executeJudgment(caseId,playerId) : await findJudgment(caseId,playerId);
    return judgment ? json(judgment) : error(404,"not_found","Julgamento ainda não disponível.");
  } catch(cause) {return internalError(cause);}
}};
