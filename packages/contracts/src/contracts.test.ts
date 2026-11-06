import { describe, expect, it } from "vitest";
import { submitAccusationRequestSchema } from "./accusation.js";
import { caseBriefingSchema } from "./briefing.js";
import {
  caseBundleSchema,
  caseGenerationOutputSchema,
  publicCaseSchema,
} from "./case.js";

const CASE_ID = "d819d84d-35d4-4e70-812a-47b8126f724b";

describe("caseBriefingSchema", () => {
  it("accepts predefined periods and normalizes surrounding spaces", () => {
    const briefing = caseBriefingSchema.parse({
      period: "victorian",
      customPeriod: null,
      crimeType: "theft",
      setting: "  Hotel isolado nas montanhas  ",
      difficulty: "medium",
      tone: "classic",
    });

    expect(briefing.setting).toBe("Hotel isolado nas montanhas");
  });

  it("requires a description only for custom periods", () => {
    expect(() =>
      caseBriefingSchema.parse({
        ...validDraft().publicCase.briefing,
        period: "custom",
        customPeriod: null,
      }),
    ).toThrow(/customPeriod/);

    expect(() =>
      caseBriefingSchema.parse({
        ...validDraft().publicCase.briefing,
        customPeriod: "Brasil colonial",
      }),
    ).toThrow(/customPeriod/);
  });
});

describe("caseGenerationOutputSchema", () => {
  it("accepts a coherent generated case", () => {
    expect(caseGenerationOutputSchema.parse(validDraft())).toBeTruthy();
  });

  it("rejects a culprit that is not a public suspect", () => {
    const draft = validDraft();
    draft.privateSolution.culpritId = "suspect_99";

    const result = caseGenerationOutputSchema.safeParse(draft);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual([
        "privateSolution",
        "culpritId",
      ]);
    }
  });

  it("rejects decisive evidence that is not public", () => {
    const draft = validDraft();
    draft.privateSolution.decisiveEvidenceIds[1] = "hidden_evidence";

    const result = caseGenerationOutputSchema.safeParse(draft);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) =>
        issue.message.includes("conteúdo público"),
      )).toBe(true);
    }
  });

  it("rejects duplicate public evidence identifiers", () => {
    const draft = validDraft();
    draft.publicCase.scene.visibleClues[0]!.id = "document_1";

    expect(caseGenerationOutputSchema.safeParse(draft).success).toBe(false);
  });
});

describe("public and private boundaries", () => {
  it("rejects private solution fields in the public case", () => {
    const bundle = validBundle();
    const leaked = {
      ...bundle.publicCase,
      privateSolution: bundle.privateSolution,
    };

    expect(publicCaseSchema.safeParse(leaked).success).toBe(false);
  });

  it("requires public and private records to reference the same case", () => {
    const bundle = validBundle();
    bundle.privateSolution.caseId = "a9eb6fac-f14b-4190-a637-aae9c36b8444";

    expect(caseBundleSchema.safeParse(bundle).success).toBe(false);
  });
});

describe("submitAccusationRequestSchema", () => {
  it("accepts one typed suspect name and rejects empty guesses", () => {
    expect(
      submitAccusationRequestSchema.parse({ suspectName: "  Helena Prado " }),
    ).toEqual({ suspectName: "Helena Prado" });

    expect(
      submitAccusationRequestSchema.safeParse({ suspectName: "   " }).success,
    ).toBe(false);
  });
});

function validBundle() {
  const draft = validDraft();

  return {
    publicCase: {
      ...draft.publicCase,
      id: CASE_ID,
      createdAt: "2026-11-06T12:00:00.000Z",
      scene: {
        ...draft.publicCase.scene,
        imageUrl: "/generated/case-scene.webp",
      },
    },
    privateSolution: {
      ...draft.privateSolution,
      caseId: CASE_ID,
    },
  };
}

function validDraft() {
  return {
    publicCase: {
      briefing: {
        period: "victorian" as const,
        customPeriod: null,
        crimeType: "theft" as const,
        setting: "Hotel isolado nas montanhas",
        difficulty: "medium" as const,
        tone: "classic" as const,
      },
      title: "O relógio da suíte 12",
      synopsis: "Uma joia desaparece durante uma tempestade que isola o hotel.",
      incident: "A joia foi retirada de um cofre entre 21h e 21h20.",
      suspects: [
        {
          id: "suspect_1",
          name: "Helena Prado",
          role: "Gerente do hotel",
          description: "Administra o hotel há dez anos e conhece todas as chaves.",
          relationshipToCase: "Foi responsável por guardar a joia antes do jantar.",
          alibi: "Afirma que estava conferindo os quartos no corredor norte.",
        },
        {
          id: "suspect_2",
          name: "Otávio Leme",
          role: "Hóspede e colecionador",
          description: "É conhecido por disputar peças raras em leilões privados.",
          relationshipToCase: "Tentou comprar a joia da proprietária naquela tarde.",
          alibi: "Diz ter permanecido na biblioteca durante toda a tempestade.",
        },
        {
          id: "suspect_3",
          name: "Clara Vidal",
          role: "Assistente da proprietária",
          description: "Organizou a viagem e conhecia a combinação anterior do cofre.",
          relationshipToCase: "Transportou a caixa da joia até o hotel.",
          alibi: "Afirma que fazia uma ligação no salão principal.",
        },
      ],
      documents: [
        {
          id: "document_1",
          title: "Registro da fechadura",
          type: "access_log" as const,
          summary: "Lista as aberturas eletrônicas da suíte durante a noite.",
          content: "21:08 — chave mestra utilizada. 21:17 — porta fechada.",
        },
        {
          id: "document_2",
          title: "Extrato da central telefônica",
          type: "communication_log" as const,
          summary: "Registra as chamadas feitas no horário do desaparecimento.",
          content: "A única ligação do salão começou às 21:22.",
        },
      ],
      scene: {
        description: "A suíte está intacta, exceto pelo cofre aberto e um relógio parado.",
        imageAlt: "Suíte vitoriana com cofre aberto e relógio sobre uma escrivaninha.",
        visibleClues: [
          {
            id: "visual_clue_1",
            label: "Relógio parado",
            description: "O relógio parou às 21:10 após receber um impacto.",
          },
        ],
      },
      investigationInstructions: "Leia os documentos e compare horários e álibis antes de acusar.",
    },
    privateSolution: {
      culpritId: "suspect_1",
      motive: "Helena pretendia vender a joia para pagar as dívidas do hotel.",
      method: "Usou a chave mestra e simulou uma falha no relógio da suíte.",
      timeline: [
        {
          time: "21:08",
          event: "Helena abriu a suíte com a chave mestra.",
        },
        {
          time: "21:10",
          event: "A joia foi retirada e o relógio sofreu o impacto.",
        },
      ],
      decisiveEvidenceIds: ["document_1", "visual_clue_1"],
      explanation: "O registro da chave mestra e o relógio contradizem o percurso declarado por Helena.",
    },
    imagePrompt: "Cena cinematográfica de uma suíte vitoriana, com cofre aberto e relógio parado às 21:10, sem pessoas e sem texto adicional.",
  };
}
