export type Step = 1 | 2 | 3 | 4 | 5 | 6;
export type SuspectId = "s1" | "s2" | "s3";
export type PremiseId = "prem1" | "prem2" | "prem3";
export type DocumentId = "p1" | "p2" | "p3" | "p4";
export type EvidenceId = "v1" | DocumentId;
export type HotspotId = "h1" | "h2" | "h3";
export type TabId = "suspeitos" | "documentos" | "hipoteses";
export type VerdictKind = "perfect" | "partial" | "wrong";

export type Suspect = { id: SuspectId; nome: string; relacao: string };
export type Briefing = {
  cenario: string;
  suspeitos: [Suspect, Suspect, Suspect];
  tiposPista: string[];
};
export type InvestigationState = {
  activeTab: TabId;
  inspectedHotspots: HotspotId[];
  readDocuments: DocumentId[];
  primeSuspectId: SuspectId | null;
  playerNotes: string;
  isZoomed: boolean;
};
export type Accusation = {
  suspectId: SuspectId | "";
  mainEvidenceId: EvidenceId | "";
  secondaryEvidenceId: EvidenceId | "";
  motiveSummary: string;
};
export type PublicDocument = {
  id: DocumentId;
  titulo: string;
  tipo: string;
  categoria: string;
  resumo: string;
  linhas: string[];
};
export type DossiePublico = {
  identificador: string;
  briefing: Briefing;
  premiseId: PremiseId;
  titulo: string;
  sinopse: string;
  localAlvo: string;
  objeto: string;
  suspeitos: Array<Suspect & { alibi: string }>;
  documentos: PublicDocument[];
  cenaDescricao: string;
};
export type SolucaoOculta = {
  culpadoId: SuspectId;
  evidenciasDecisivas: [EvidenceId, EvidenceId];
  alternativaValida: [EvidenceId, EvidenceId];
  cronologia: Array<{ hora: string; fato: string }>;
  explicacao: string;
};
export type Verdict = {
  kind: VerdictKind;
  acusacao: Accusation;
  culpadoNome: string;
  cronologia: SolucaoOculta["cronologia"];
  explicacao: string;
  provasEsperadas: string;
};
export type SharedPayload = { briefing: Briefing; selectedPremiseId: PremiseId };

export const EVIDENCE_TYPES = [
  "Horários e Relógios",
  "Condições Climáticas",
  "Registros de Comunicação",
  "Controle de Acesso",
  "Depoimentos",
] as const;

export const defaultBriefing: Briefing = {
  cenario: "Mansão Vitoriana durante um jantar de negócios",
  suspeitos: [
    { id: "s1", nome: "Arthur", relacao: "Mordomo" },
    { id: "s2", nome: "Beatriz", relacao: "Sobrinha Endividada" },
    { id: "s3", nome: "Carlos", relacao: "Sócio Comercial" },
  ],
  tiposPista: [
    "Horários e Relógios",
    "Condições Climáticas",
    "Registros de Comunicação",
    "Controle de Acesso",
  ],
};

export const emptyInvestigation = (): InvestigationState => ({
  activeTab: "suspeitos",
  inspectedHotspots: [],
  readDocuments: [],
  primeSuspectId: null,
  playerNotes: "",
  isZoomed: false,
});

export const emptyAccusation = (): Accusation => ({
  suspectId: "",
  mainEvidenceId: "",
  secondaryEvidenceId: "",
  motiveSummary: "",
});

export const STEPS: { numero: Step; nome: string }[] = [
  { numero: 1, nome: "Configurar" },
  { numero: 2, nome: "Escolher" },
  { numero: 3, nome: "Gerar" },
  { numero: 4, nome: "Investigar" },
  { numero: 5, nome: "Acusar" },
  { numero: 6, nome: "Guardar" },
];

export const HOTSPOTS: Array<{ id: HotspotId; nome: string; observacao: string }> = [
  {
    id: "h1",
    nome: "Relógio de parede",
    observacao:
      "O relógio parou às 21:10. Compare esse horário com o registro de acesso e os álibis.",
  },
  {
    id: "h2",
    nome: "Cinzeiro e maleta",
    observacao:
      "Uma ponta de cigarro está seca e recém-apagada junto à maleta aberta e a um cartão de acesso. Há marcas de batom no filtro.",
  },
  {
    id: "h3",
    nome: "Janela para o jardim",
    observacao:
      "A janela mostra chuva muito intensa na área descoberta. Compare com o depoimento de quem disse estar ao ar livre.",
  },
];

export const EVIDENCE_LABELS: Record<EvidenceId, string> = {
  v1: "Cena visual — relógio, cigarro e janela",
  p1: "Registro de rede e telefonia",
  p2: "Boletim meteorológico",
  p3: "Declaração da equipe de apoio",
  p4: "Relatório da fechadura eletrônica",
};

export const PREMISE_DETAILS: Record<PremiseId, { prefixo: string; sinopse: string; alvo: string; objeto: string; evento: string }> = {
  prem1: {
    prefixo: "O Roubo das 21:10",
    sinopse:
      "Um item valioso desaparece da sala principal durante uma forte tempestade; todos alegam estar em outros cômodos.",
    alvo: "vitrine da sala principal",
    objeto: "peça valiosa",
    evento: "retira a peça valiosa da vitrine",
  },
  prem2: {
    prefixo: "Sabotagem Silenciosa",
    sinopse:
      "O cofre principal é aberto com uma credencial interna minutos antes do anúncio oficial.",
    alvo: "cofre da sala principal",
    objeto: "documentos do cofre",
    evento: "retira documentos do cofre",
  },
  prem3: {
    prefixo: "O Álibi Fragmentado",
    sinopse:
      "Uma falha de energia de 15 minutos encobre a entrada não autorizada na sala restrita.",
    alvo: "armário da sala restrita",
    objeto: "pasta lacrada",
    evento: "retira a pasta lacrada do armário",
  },
};

export function cloneBriefing(briefing: Briefing): Briefing {
  return {
    cenario: briefing.cenario,
    suspeitos: briefing.suspeitos.map((s) => ({ ...s })) as Briefing["suspeitos"],
    tiposPista: [...briefing.tiposPista],
  };
}

export function getPremises(cenario: string) {
  return (["prem1", "prem2", "prem3"] as PremiseId[]).map((id) => ({
    id,
    titulo: `${PREMISE_DETAILS[id].prefixo} em ${cenario.trim() || "seu cenário"}`,
    sinopse: PREMISE_DETAILS[id].sinopse,
  }));
}

export function createDossiePublico(briefingInput: Briefing, premiseId: PremiseId): DossiePublico {
  const briefing = cloneBriefing(briefingInput);
  const [primeiro, segundo, terceiro] = briefing.suspeitos;
  const premise = PREMISE_DETAILS[premiseId];
  const cenario = briefing.cenario;
  const documentos: PublicDocument[] = [
    {
      id: "p1",
      titulo: "Registro de Rede e Telefonia",
      tipo: "LOG DE REDE / FORMATO TABELA",
      categoria: "Registros de Comunicação",
      resumo: `Registro do terminal utilizado por ${terceiro.nome}.`,
      linhas: [
        `TERMINAL: ${terceiro.nome} (${terceiro.relacao})`,
        "20:30 | Chamada iniciada | Conectado",
        "21:10 | Sessão contínua | Sem interrupção",
        "21:32 | Chamada encerrada | Registro auditado",
        `LOCAL DA OCORRÊNCIA: ${cenario}`,
      ],
    },
    {
      id: "p2",
      titulo: "Boletim Meteorológico Local",
      tipo: "LAUDO / DOCUMENTO OFICIAL",
      categoria: "Condições Climáticas",
      resumo: `Condições na área externa de ${cenario}.`,
      linhas: [
        "LOCAL: jardim descoberto / estação meteorológica",
        "20:55–21:25 | Chuva torrencial e ventos fortes",
        "CONCLUSÃO: permanecer fora resultaria em roupas molhadas; um cigarro aceso não permaneceria seco.",
        `DEPOIMENTO A COMPARAR: ${segundo.nome} (${segundo.relacao})`,
      ],
    },
    {
      id: "p3",
      titulo: "Declaração da Equipe de Apoio",
      tipo: "TERMO DE DEPOIMENTO",
      categoria: "Depoimentos",
      resumo: `Relato sobre a circulação de ${primeiro.nome}.`,
      linhas: [
        "DECLARANTE: equipe interna de apoio",
        `TESTEMUNHO: ${primeiro.nome} (${primeiro.relacao}) permaneceu na área interna de serviço.`,
        "PERÍODO OBSERVADO: 20:45–21:30",
        "OBSERVAÇÃO: ninguém o viu sair para a sala principal.",
      ],
    },
    {
      id: "p4",
      titulo: "Relatório da Fechadura Eletrônica",
      tipo: "LOG DE SEGURANÇA",
      categoria: "Controle de Acesso",
      resumo: `Eventos de acesso à ${premise.alvo}.`,
      linhas: [
        `AMBIENTE: ${cenario}`,
        "21:08 | Credencial interna | Sala principal aberta",
        `21:10 | Alarme silencioso | ${premise.alvo}`,
        ...(premiseId === "prem3" ? ["21:00–21:15 | Queda de energia | Log preservado por bateria"] : []),
        "21:15 | Porta da sala principal | Fechamento confirmado",
      ],
    },
  ];

  return {
    identificador: "MIST-2110",
    briefing,
    premiseId,
    titulo: `${premise.prefixo} em ${cenario}`,
    sinopse: premise.sinopse,
    localAlvo: premise.alvo,
    objeto: premise.objeto,
    suspeitos: [
      {
        ...primeiro,
        alibi: `Questionado sobre ${premise.objeto}, ${primeiro.nome} (${primeiro.relacao}) afirma que esteve na cozinha/área de serviço de ${cenario} das 20:45 às 21:30, sem sair.`,
      },
      {
        ...segundo,
        alibi: `Questionado sobre ${premise.objeto}, ${segundo.nome} (${segundo.relacao}) afirma que saiu para o jardim descoberto de ${cenario} às 21:00 para fumar e voltou às 21:15.`,
      },
      {
        ...terceiro,
        alibi: `Questionado sobre ${premise.objeto}, ${terceiro.nome} (${terceiro.relacao}) afirma que permaneceu no escritório de ${cenario} em videoconferência das 20:30 às 21:30.`,
      },
    ],
    documentos,
    cenaDescricao: `Sala principal em ${cenario}. Uma maleta aberta perto de ${premise.alvo}, um relógio parado às 21:10 e uma janela voltada para o jardim.`,
  };
}

// Solução separada do dossiê. Em produção, deve residir exclusivamente no backend.
export function createSolucaoOculta(dossie: DossiePublico): SolucaoOculta {
  const suspeito = dossie.briefing.suspeitos[1];
  const premise = PREMISE_DETAILS[dossie.premiseId];
  return {
    culpadoId: "s2",
    evidenciasDecisivas: ["v1", "p2"],
    alternativaValida: ["v1", "p4"],
    cronologia: [
      { hora: "20:55", fato: `Uma tempestade começa em ${dossie.briefing.cenario}.` },
      { hora: "21:08", fato: `${suspeito.nome} (${suspeito.relacao}) entra na sala principal com uma credencial interna.` },
      { hora: "21:10", fato: `${suspeito.nome} fuma na sala, deixa um cigarro seco e ${premise.evento}.` },
      { hora: "21:15", fato: `${suspeito.nome} afirma ter retornado do jardim, simulando um álibi.` },
    ],
    explicacao: `O álibi de ${suspeito.nome} (${suspeito.relacao}) não é compatível com o temporal entre 20:55 e 21:25. O cigarro seco na sala às 21:10 e o evento eletrônico registrado nesse horário vinculam o depoimento falso à ocorrência de ${dossie.objeto} em ${dossie.briefing.cenario}.`,
  };
}

// Único ponto de leitura da solução; chamado exclusivamente na confirmação da Etapa 06.
export function validateAccusation(acusacao: Accusation, solucaoOculta: SolucaoOculta, dossie: DossiePublico): Verdict {
  const provas = [acusacao.mainEvidenceId, acusacao.secondaryEvidenceId];
  const acertouCulpado = acusacao.suspectId === solucaoOculta.culpadoId;
  const paresValidos = [solucaoOculta.evidenciasDecisivas, solucaoOculta.alternativaValida];
  const parDecisivo = paresValidos.some((par) => par.every((evidencia) => provas.includes(evidencia)));
  const kind: VerdictKind = !acertouCulpado
    ? "wrong"
    : parDecisivo
      ? "perfect"
      : "partial";
  return {
    kind,
    acusacao: { ...acusacao },
    culpadoNome: dossie.briefing.suspeitos.find((s) => s.id === solucaoOculta.culpadoId)?.nome || "Suspeito 2",
    cronologia: solucaoOculta.cronologia,
    explicacao: solucaoOculta.explicacao,
    provasEsperadas: paresValidos.map((par) => par.map((id) => `${EVIDENCE_LABELS[id]} (${id})`).join(" + ")).join("; ou "),
  };
}

export function encodeShare(payload: SharedPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeShare(hash: string): SharedPayload | null {
  try {
    const match = /^#MIST-2110-([A-Za-z0-9_-]{1,6000})$/.exec(hash);
    if (!match) return null;
    const encoded = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!raw || typeof raw !== "object") return null;
    const parsed = raw as Partial<SharedPayload>;
    if (!parsed.briefing || !parsed.selectedPremiseId || !PREMISE_DETAILS[parsed.selectedPremiseId]) return null;
    const input = parsed.briefing;
    if (
      typeof input.cenario !== "string" ||
      !input.cenario.trim() ||
      input.cenario.length > 180 ||
      !Array.isArray(input.suspeitos) ||
      input.suspeitos.length !== 3 ||
      !Array.isArray(input.tiposPista) ||
      input.tiposPista.length < 2 ||
      input.tiposPista.length > EVIDENCE_TYPES.length ||
      !input.tiposPista.every((t) => EVIDENCE_TYPES.some((allowed) => allowed === t))
    ) return null;
    for (let i = 0; i < 3; i += 1) {
      const s = input.suspeitos[i];
      if (
        !s || s.id !== `s${i + 1}` ||
        typeof s.nome !== "string" || !s.nome.trim() || s.nome.length > 80 ||
        typeof s.relacao !== "string" || s.relacao.length > 120
      ) return null;
    }
    return { briefing: cloneBriefing(input), selectedPremiseId: parsed.selectedPremiseId };
  } catch {
    return null;
  }
}

