import type { AppConfig } from "../config/index.js";
import type { CaseRepository } from "../database/index.js";
import { SvgImageGenerator } from "./svg-image-generator.js";
import { portraitSheetRequest } from "./portrait-sheet.js";
import type {
  CaseImageGenerator,
  GeneratedImage,
  ImageGenerationRequest,
  ImageStorage,
} from "./types.js";

export type CaseImageGenerationResult = {
  imageUrl: string;
  portraitSheetUrl: string;
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

    const sceneRequest = {
      caseId,
      prompt: draft.imagePrompt,
      altText: draft.publicCase.scene.imageAlt,
    };
    const portraitsRequest = portraitSheetRequest(caseId, draft.publicCase.briefing, draft.publicCase.suspects);

    try {
      const [scene, portraits] = await Promise.all([
        this.generateWithFallback(sceneRequest),
        this.generateWithFallback(portraitsRequest),
      ]);
      const [storedScene, storedPortraits] = await Promise.all([
        this.storage.save(caseId, scene.image),
        this.storage.save(caseId, portraits.image, "portraits"),
      ]);
      const publicCase = {
        ...draft.publicCase,
        id: caseId,
        createdAt: draft.createdAt,
        portraitSheetUrl: storedPortraits.publicUrl,
        scene: {
          ...draft.publicCase.scene,
          imageUrl: storedScene.publicUrl,
        },
      };

      this.cases.complete(publicCase, {
        provider: scene.image.metadata.provider,
        model: scene.image.metadata.model,
        filePath: storedScene.filePath,
        isFallback: scene.isFallback,
        usage: scene.image.metadata.usage,
      });

      return {
        imageUrl: storedScene.publicUrl,
        portraitSheetUrl: storedPortraits.publicUrl,
        isFallback: scene.isFallback,
        image: scene.image,
      };
    } catch (error) {
      this.cases.fail(caseId, "Não foi possível preparar a imagem do caso.");
      throw error;
    }
  }

  private async generateWithFallback(request: ImageGenerationRequest): Promise<{ image: GeneratedImage; isFallback: boolean }> {
    try {
      return { image: await this.generator.generate(request), isFallback: false };
    } catch (error) {
      if (!this.imagesConfig.fallback_enabled) throw error;
      return { image: await this.fallbackGenerator.generate(request), isFallback: true };
    }
  }
}
