import { db } from "../../_shared/db.js";
import { getInsights } from "../../_shared/observability.js";
import { caseIdFromRequest, error, internalError, json, methodNotAllowed } from "../../_shared/http.js";
export default {async fetch(request:Request) {
  if(request.method!=="GET") return methodNotAllowed();
  const caseId=caseIdFromRequest(request);
  if(!caseId) return error(400,"invalid_request","Identificador de caso inválido.");
  try {
    const sql=db(); const rows=await sql`SELECT id FROM cases WHERE id=${caseId}`;
    if (!rows[0]) return error(404,"not_found","Caso não encontrado.");
    const insights=await getInsights(caseId);
    return json({...insights,quality:insights.quality ? {...insights.quality,findings:[]} : null});
  } catch(cause) {return internalError(cause);}
}};
