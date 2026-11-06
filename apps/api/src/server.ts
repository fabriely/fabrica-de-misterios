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
} from "./image/index.js";

let storage: OpenDatabaseResult | undefined;
const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));

try {
  const config = await loadConfig({ cwd: projectRoot });
  storage = openDatabase({
    filename: config.database.path,
    baseDirectory: projectRoot,
  });
  const cases = new CaseRepository(storage.database);
  const textGeneration = new CaseTextGenerationService(
    cases,
    createTextCaseGenerator(config),
    config.generation,
  );
  const imageGeneration = new CaseImageGenerationService(
    cases,
    createCaseImageGenerator(config),
    new LocalImageStorage(config.images, projectRoot),
    config.images,
  );
  const workflow = new DefaultCaseGenerationWorkflow(
    textGeneration,
    imageGeneration,
  );
  const generationQueue = new CaseGenerationQueue(workflow, (caseId) => {
    console.error(`[generation] O caso ${caseId} terminou com falha.`);
  });
  const app = buildApp({
    game: {
      cases,
      generationQueue,
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

  await app.listen(config.server);
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`[config] ${error.message}`);
  } else {
    console.error("[startup] Não foi possível iniciar a API.", error);
  }

  storage?.database.close();
  process.exitCode = 1;
}
