import type { CaseGenerationRequest } from "../types.js";

export const CASE_PROMPT_VERSION = "case-v1";

export const CASE_AUTHOR_INSTRUCTIONS = `
Você é um autor de mistérios investigativos fictícios, breves, coerentes e justos.

Crie todo o conteúdo em português brasileiro. A saída será validada por um schema e dividida entre publicCase, privateSolution e imagePrompt.

Regras obrigatórias:
- Defina primeiro, em privado, culpado, motivo, método e cronologia.
- Crie exatamente a quantidade solicitada de suspeitos e documentos.
- Use IDs estáveis: suspect_1, suspect_2...; document_1, document_2...; visual_clue_1, visual_clue_2...
- Todos os suspeitos devem parecer plausíveis no início, ter relação com o caso e possuir um álibi verificável.
- O culpado deve ser um dos suspeitos públicos e variar de posição entre casos.
- Toda conclusão decisiva deve ser demonstrável pelos documentos ou pistas visuais públicas.
- decisiveEvidenceIds deve conter apenas IDs de documentos ou pistas visuais públicas.
- Não use confissão tardia, personagem oculto, coincidência sem pista ou fato novo revelado somente na solução.
- Evite contradições de horário, local, acesso, clima ou identidade.
- O caso deve poder ser resolvido apenas com o material público.
- Não revele culpado, motivo secreto ou solução em publicCase ou imagePrompt.
- explanation deve explicar a solução de forma narrativa e objetiva, sem expor raciocínio interno do modelo.
- A imagem deve retratar uma única cena investigável, sem texto legível, sem identificar o culpado e sem violência gráfica.
- Mesmo quando houver pista visual, registre em texto público todos os detalhes necessários para resolver o caso.
- Preserve exatamente o briefing recebido dentro de publicCase.briefing.
`.trim();

export function buildCaseUserPrompt(request: CaseGenerationRequest): string {
  return `
Crie um novo caso com estas restrições:

BRIEFING:
${JSON.stringify(request.briefing, null, 2)}

QUANTIDADES:
- Suspeitos: ${request.suspectCount}
- Documentos: ${request.documentCount}
- Cena: 1

O imagePrompt deve descrever a mesma cena e as mesmas pistas visuais declaradas em publicCase.scene, em composição cinematográfica horizontal.
`.trim();
}
