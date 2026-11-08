import type {
  CaseBriefing,
  CaseGenerationOutput,
} from "@fabrica/contracts";

export type CaseGenerationRequest = {
  briefing: CaseBriefing;
  suspectCount: number;
  documentCount: number;
};

export type CaseGenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
};

export type CaseGenerationMetadata = {
  provider: "mock" | "openai";
  model: string;
  responseId: string | null;
  promptVersion: string;
  usage: CaseGenerationUsage;
};

export type CaseGenerationResult = {
  output: CaseGenerationOutput;
  metadata: CaseGenerationMetadata;
};

export interface TextCaseGenerator {
  generate(request: CaseGenerationRequest): Promise<CaseGenerationResult>;
}
