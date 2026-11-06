import type { AppConfig } from "../config/index.js";
import type { CaseRepository } from "../database/index.js";
import { SvgImageGenerator } from "./svg-image-generator.js";
import type {
  CaseImageGenerator,
  GeneratedImage,
  ImageStorage,
} from "./types.js";

export type CaseImageGenerationResult = {
  imageUrl: string;
  isFallback: boolean;
  image: GeneratedImage;
};

export class CaseImageGenerationService {
  private readonly fallbackGenerator = new SvgImageGenerator("fallback");

  constructor(
    private readonly cases: CaseRepository,
    private readonly generator: CaseImageGenerator,
    private readonly storage: ImageStorage,
    private readonly imagesConfig: Pick<AppConfig["images"], "fallback_enabled">,
  ) {}

  async generate(caseId: string): Promise<CaseImageGenerationResult> {
    const draft = this.cases.findGenerationDraft(caseId);
    if (!draft || this.cases.findStatus(caseId)?.status !== "generating_image") {
      throw new Error("O caso não está pronto para gerar a imagem.");
    }

    const request = {
      caseId,
      prompt: draft.imagePrompt,
      altText: draft.publicCase.scene.imageAlt,
    };

    try {
      let image: GeneratedImage;
      let isFallback = false;

      try {
        image = await this.generator.generate(request);
      } catch (error) {
        if (!this.imagesConfig.fallback_enabled) throw error;
        image = await this.fallbackGenerator.generate(request);
        isFallback = true;
      }

      const stored = await this.storage.save(caseId, image);
      const publicCase = {
        ...draft.publicCase,
        id: caseId,
        createdAt: draft.createdAt,
        scene: {
          ...draft.publicCase.scene,
          imageUrl: stored.publicUrl,
        },
      };

      this.cases.complete(publicCase, {
        provider: image.metadata.provider,
        model: image.metadata.model,
        filePath: stored.filePath,
        isFallback,
        usage: image.metadata.usage,
      });

      return { imageUrl: stored.publicUrl, isFallback, image };
    } catch (error) {
      this.cases.fail(caseId, "Não foi possível preparar a imagem do caso.");
      throw error;
    }
  }
}
