import { buildApp } from "./app.js";
import { ConfigError, createSafeConfigSummary, loadConfig } from "./config/index.js";

try {
  const config = await loadConfig();
  const app = buildApp();

  app.log.info(
    { config: createSafeConfigSummary(config) },
    "Configuração carregada",
  );

  await app.listen(config.server);
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`[config] ${error.message}`);
  } else {
    console.error("[startup] Não foi possível iniciar a API.", error);
  }

  process.exitCode = 1;
}
