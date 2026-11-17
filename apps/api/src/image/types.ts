export type ImageFileExtension = "png" | "webp" | "jpeg" | "svg";

export type ImageGenerationRequest = {
  caseId: string;
  prompt: string;
  altText: string;
  purpose?: "scene" | "portrait_sheet";
  portraitCount?: number;
};

export type ImageGenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  inputTextTokens?: number | null;
  inputImageTokens?: number | null;
};

export type GeneratedImage = {
  bytes: Uint8Array;
  extension: ImageFileExtension;
  mediaType: string;
  metadata: {
    provider: "mock" | "openai" | "fallback";
    model: string;
    usage: ImageGenerationUsage;
  };
};

export type StoredImage = {
  filePath: string;
  publicUrl: string;
};

export interface CaseImageGenerator {
  generate(request: ImageGenerationRequest): Promise<GeneratedImage>;
}

export interface ImageStorage {
  save(caseId: string, image: GeneratedImage, kind?: "scene" | "portraits"): Promise<StoredImage>;
}
