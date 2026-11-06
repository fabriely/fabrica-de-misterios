import { buildApp } from "./app.js";
import { ConfigError, createSafeConfigSummary, loadConfig } from "./config/index.js";
import { openDatabase } from "./database/index.js";
import type { OpenDatabaseResult } from "./database/index.js";

let storage: OpenDatabaseResult | undefined;

try {
  const config = await loadConfig();
  storage = openDatabase({ filename: config.database.path });
  const app = buildApp();

  app.addHook("onClose", async () => {
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
