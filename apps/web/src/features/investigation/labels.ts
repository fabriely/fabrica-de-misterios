import type {
  CrimeType,
  Difficulty,
  DocumentType,
  MysteryTone,
  PeriodPreset,
} from "@fabrica/contracts";

export const periodLabels: Record<PeriodPreset, string> = {
  medieval: "Medieval",
  victorian: "Era Vitoriana",
  "1920s": "Anos 1920",
  contemporary: "Contemporâneo",
  futuristic: "Futurista",
  custom: "Período personalizado",
};

export const crimeLabels: Record<CrimeType, string> = {
  murder: "Assassinato",
  theft: "Roubo",
  disappearance: "Desaparecimento",
  sabotage: "Sabotagem",
};

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "Iniciante",
  medium: "Investigador",
  hard: "Mestre",
};

export const toneLabels: Record<MysteryTone, string> = {
  classic: "Clássico",
  dark: "Sombrio",
  suspense: "Suspense",
};

const documentLabels: Record<DocumentType, string> = {
  police_report: "Relatório policial",
  witness_statement: "Depoimento",
  forensic_report: "Laudo pericial",
  communication_log: "Registro de comunicação",
  access_log: "Registro de acesso",
  financial_record: "Registro financeiro",
  personal_letter: "Carta pessoal",
  newspaper: "Recorte de jornal",
  other: "Documento",
};

export function documentTypeLabel(type: DocumentType) {
  return documentLabels[type];
}
