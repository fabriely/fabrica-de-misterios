import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { ConfigError, createSafeConfigSummary, loadConfig } from "./config/index.js";
import { openDatabase } from "./database/index.js";
import { CaseRepository } from "./database/index.js";
import type { OpenDatabaseResult } from "./database/index.js";
import {
  CaseGenerationQueue,
  CaseTextGenerationService,
  DefaultCaseGenerationWorkflow,
  createTextCaseGenerator,
} from "./generation/index.js";
import {
  CaseImageGenerationService,
  LocalImageStorage,
  createCaseImageGenerator,
  OpenAiVisualJudge,
} from "./image/index.js";
import { AccusationService } from "./accusation/index.js";
import { AccusationRepository } from "./database/index.js";
import { PremiseRepository, InsightsRepository } from "./database/index.js";
import { IntelligenceServices } from "./ai/services.js";
import { createPremiseGenerator } from "./generation/index.js";

let storage: OpenDatabaseResult | undefined;
const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));

try {
  const config = await loadConfig({ cwd: projectRoot, fallbackFilename: "config.example.toml" });
  storage = openDatabase({
    filename: config.database.path,
    baseDirectory: projectRoot,
  });
  const cases = new CaseRepository(storage.database);
  const accusations = new AccusationService(
    cases,
    new AccusationRepository(storage.database),
  );
  const insights = new InsightsRepository(storage.database);
  const intelligence = new IntelligenceServices(cases, new AccusationRepository(storage.database), insights, {
    provider: (process.env.JUDGE_PROVIDER === "openai" || process.env.JUDGE_PROVIDER === "mock")
      ? process.env.JUDGE_PROVIDER : config.generation.provider,
    model: process.env.OPENAI_JUDGE_MODEL ?? config.openai.text_model,
    apiKey: config.openai.api_key,
  });
  const textGeneration = new CaseTextGenerationService(
    cases,
    createTextCaseGenerator(config),
    config.generation,
    (op) => insights.record(op),
  );
  const imageGeneration = new CaseImageGenerationService(
    cases,
    createCaseImageGenerator(config),
    new LocalImageStorage(config.images, projectRoot),
    config.images,
    config.generation.provider === "openai"
      ? new OpenAiVisualJudge({
          apiKey: config.openai.api_key,
          model: process.env.OPENAI_VISUAL_JUDGE_MODEL ?? "gpt-6.1-terra",
          timeoutSeconds: config.openai.timeout_seconds,
        })
      : undefined,
    (op) => insights.record(op),
  );
  const workflow = new DefaultCaseGenerationWorkflow(
    textGeneration,
    imageGeneration,
    (caseId) => intelligence.reviewQuality(caseId),
  );
  const generationQueue = new CaseGenerationQueue(workflow, (caseId) => {
    const status = cases.findStatus(caseId);
    if (status && status.status !== "ready" && status.status !== "failed") {
      try {
        cases.fail(caseId, "Não foi possível concluir a geração do caso.");
      } catch {
        // The queue must continue even if another transition already won.
      }
    }
    console.error(`[generation] O caso ${caseId} terminou com falha.`);
  }, config.generation.max_concurrent_generations);
  const recoveredCases = cases.recoverAfterRestart();
  for (const recovered of recoveredCases) {
    generationQueue.enqueue(recovered.caseId, recovered.briefing, recovered.premise);
  }
  const app = buildApp({
    bodyLimitBytes: config.server.body_limit_kb * 1_024,
    game: {
      cases,
      premises: new PremiseRepository(storage.database),
      premiseGenerator: createPremiseGenerator(config),
      accusations,
      insights,
      intelligence,
      generationQueue,
      generationLimits: {
        maxCasesPerHour: config.generation.max_case_generations_per_hour,
      },
      images: config.images,
      baseDirectory: projectRoot,
    },
  });

  app.addHook("onClose", async () => {
    await generationQueue.drain();
    storage?.database.close();
  });

  app.log.info(
    {
      config: createSafeConfigSummary(config),
      database: {
        filename: storage.filename,
        schemaVersion: storage.schemaVersion,
      },
      recovery: {
        queuedCases: recoveredCases.length,
      },
    },
    "Configuração carregada",
  );

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "Encerrando a API");
    try {
      await app.close();
    } catch {
      app.log.error("Não foi possível encerrar a API corretamente");
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({
    host: config.server.host,
    port: config.server.port,
  });
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`[config] ${error.message}`);
  } else {
    console.error("[startup] Não foi possível iniciar a API.", error);
  }

  storage?.database.close();
  process.exitCode = 1;
}
