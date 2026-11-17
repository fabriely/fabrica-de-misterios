import type { AppConfig } from "../config/index.js";
import { measured } from "../ai/monitoring.js";
import type { Meter } from "../ai/monitoring.js";
import type { CaseRepository } from "../database/index.js";
import { SvgImageGenerator } from "./svg-image-generator.js";
import { portraitSheetRequest } from "./portrait-sheet.js";
import { imageDataUrl, promptWithVisualCorrections, reviewPassed } from "./visual-judge.js";
import type { VisualJudge, VisualReviewResult } from "./visual-judge.js";
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
    private readonly visualJudge?: VisualJudge,
    private readonly meter?: Meter,
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
      const [initialScene, portraits] = await Promise.all([
        this.generateMeasured(sceneRequest, "scene_image", caseId),
        this.generateMeasured(portraitsRequest, "portraits_image", caseId),
      ]);
      let scene = initialScene;
      if (scene.image.metadata.provider === "openai" && this.visualJudge) {
        try {
          const firstReview = await this.reviewScene(caseId, scene.image, draft.publicCase, draft.imagePrompt);
          if (!reviewPassed(firstReview.review)) {
            scene = await this.generateMeasured({
              ...sceneRequest,
              prompt: promptWithVisualCorrections(draft.imagePrompt, firstReview.review),
            }, "scene_image", caseId);
            if (scene.image.metadata.provider === "openai") {
              const secondReview = await this.reviewScene(caseId, scene.image, draft.publicCase, draft.imagePrompt);
              if (!reviewPassed(secondReview.review)) {
                if (!this.imagesConfig.fallback_enabled) throw new Error("A cena foi reprovada na revisão visual.");
                scene = { image: await this.fallbackGenerator.generate(sceneRequest), isFallback: true };
              }
            }
          }
        } catch {
          if (!this.imagesConfig.fallback_enabled) throw new Error("Não foi possível aprovar a imagem da cena.");
          scene = { image: await this.fallbackGenerator.generate(sceneRequest), isFallback: true };
        }
      }
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

  private generateMeasured(request: ImageGenerationRequest, stage: "scene_image" | "portraits_image", caseId: string) {
    return measured(this.meter, stage, { caseId }, () => this.generateWithFallback(request),
      (value) => ({
        provider: value?.image.metadata.provider ?? "openai",
        model: value?.image.metadata.model ?? "unknown",
        usage: value?.image.metadata.usage,
        isFallback: value?.isFallback,
      }));
  }

  private reviewScene(caseId: string, image: GeneratedImage, draft: NonNullable<ReturnType<CaseRepository["findGenerationDraft"]>>["publicCase"], imagePrompt: string): Promise<VisualReviewResult> {
    return measured(this.meter, "visual_review", { caseId },
      () => this.visualJudge!.review({ imageUrl: imageDataUrl(image.bytes, image.mediaType), draft, imagePrompt }),
      (value) => ({ provider: "openai", model: value?.model ?? process.env.OPENAI_VISUAL_JUDGE_MODEL ?? "gpt-6.1-terra", usage: value?.usage }));
  }
}
