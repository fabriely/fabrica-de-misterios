import type { CaseGenerationOutput } from "@fabrica/contracts";
import { CASE_PROMPT_VERSION } from "./prompts/case-v1.js";
import type {
  CaseGenerationRequest,
  CaseGenerationResult,
  TextCaseGenerator,
} from "./types.js";
import { validateGeneratedCase } from "./validate-output.js";

const suspectNames = [
  "Helena Prado",
  "Otávio Leme",
  "Clara Vidal",
  "Augusto Nobre",
  "Lívia Torres",
  "Miguel Salles",
  "Teresa Moura",
  "Rafael Brandão",
];

const crimeDescriptions = {
  murder: "Uma morte suspeita é descoberta pouco antes do local ser isolado.",
  theft: "Um objeto valioso desaparece durante uma breve interrupção na rotina.",
  disappearance: "Uma pessoa desaparece, deixando versões incompatíveis sobre seus últimos passos.",
  sabotage: "Uma sabotagem coloca o evento em risco e encobre o acesso a uma área restrita.",
} as const;

export class MockCaseGenerator implements TextCaseGenerator {
  async generate(
    request: CaseGenerationRequest,
  ): Promise<CaseGenerationResult> {
    const output = validateGeneratedCase(createMockOutput(request), request);

    return {
      output,
      metadata: {
        provider: "mock",
        model: "mock-case-generator",
        responseId: null,
        promptVersion: CASE_PROMPT_VERSION,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          totalTokens: 0,
        },
      },
    };
  }
}

function createMockOutput(
  request: CaseGenerationRequest,
): CaseGenerationOutput {
  const suspects = Array.from({ length: request.suspectCount }, (_, index) => ({
    id: `suspect_${index + 1}`,
    name: suspectNames[index] ?? `Suspeito ${index + 1}`,
    role: index === 0 ? "Responsável pelas chaves" : `Testemunha ${index + 1}`,
    description: `Pessoa ligada ao cenário ${request.briefing.setting} e aos acontecimentos daquela noite.`,
    relationshipToCase:
      index === 0
        ? "Controlava o acesso à área onde o incidente ocorreu."
        : "Esteve no local durante o intervalo investigado.",
    alibi:
      index === 0
        ? "Afirma ter permanecido no corredor norte entre 21h e 21h30."
        : `Afirma que conversava com outra testemunha por volta de 21h${index}0.`,
  }));

  const documents = Array.from(
    { length: request.documentCount },
    (_, index) => ({
      id: `document_${index + 1}`,
      title:
        index === 0
          ? "Registro de acesso à área restrita"
          : `Documento complementar ${index + 1}`,
      type: index === 0 ? ("access_log" as const) : ("witness_statement" as const),
      summary:
        index === 0
          ? "O registro apresenta uma entrada incompatível com um dos álibis."
          : "Relato público que ajuda a reconstruir a sequência de acontecimentos.",
      content:
        index === 0
          ? "21:08 — credencial da pessoa responsável pelas chaves utilizada. 21:17 — porta fechada."
          : `A testemunha ${index + 1} ouviu movimento no corredor entre 21h e 21h20.`,
    }),
  );

  return {
    publicCase: {
      briefing: request.briefing,
      title: request.premise?.title ?? "O segredo das 21h10",
      synopsis: request.premise
        ? `${request.premise.synopsis} ${crimeDescriptions[request.briefing.crimeType]}`
        : `${crimeDescriptions[request.briefing.crimeType]} Todos apresentam álibis aparentemente sólidos.`,
      incident: `O incidente ocorreu em ${request.briefing.setting}, entre 21h e 21h20.`,
      suspects,
      documents,
      scene: {
        description:
          "A área principal está organizada, exceto por uma porta entreaberta e um relógio parado às 21h10.",
        imageAlt:
          "Cena investigativa com uma porta entreaberta, um relógio parado e sinais discretos de acesso recente.",
        visibleClues: [
          {
            id: "visual_clue_1",
            label: "Relógio parado",
            description:
              "O relógio parou às 21h10 após um impacto recente, fixando o momento central da ocorrência.",
          },
        ],
      },
      investigationInstructions:
        "Leia os documentos, compare horários e álibis e escolha apenas um nome ao concluir.",
    },
    privateSolution: {
      culpritId: "suspect_1",
      motive:
        "A pessoa responsável pelas chaves precisava ocultar uma dívida ligada ao incidente.",
      method:
        "Utilizou seu acesso autorizado e alterou a cena para sustentar um álibi falso.",
      timeline: [
        {
          time: "21:08",
          event: "A credencial da pessoa responsável pelas chaves abriu a área restrita.",
        },
        {
          time: "21:10",
          event: "O incidente aconteceu e o relógio sofreu o impacto observado na cena.",
        },
        {
          time: "21:17",
          event: "A porta foi fechada e o álibi falso começou a ser apresentado.",
        },
      ],
      decisiveEvidenceIds: ["document_1", "visual_clue_1"],
      explanation:
        "O registro de acesso liga a credencial ao local, enquanto o relógio fixa um horário incompatível com o álibi apresentado.",
    },
    imagePrompt: `Cena investigativa cinematográfica horizontal em ${request.briefing.setting}, com porta entreaberta e relógio parado às 21h10, atmosfera ${request.briefing.tone}, sem pessoas identificáveis, sem texto legível e sem violência gráfica.`,
  };
}
