import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "smol-toml";
import { configSchema } from "./schema.js";
import type { AppConfig } from "./schema.js";

const DEFAULT_CONFIG_FILENAME = "config.toml";

type LoadConfigOptions = {
  cwd?: string;
  filename?: string;
  fallbackFilename?: string;
  env?: NodeJS.ProcessEnv;
};

export class ConfigError extends Error {
  readonly configPath: string;

  constructor(message: string, configPath: string) {
    super(message);
    this.name = "ConfigError";
    this.configPath = configPath;
  }
}

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<AppConfig> {
  const cwd = options.cwd ?? process.cwd();
  const filename = options.filename ?? DEFAULT_CONFIG_FILENAME;
  const configPath = path.resolve(cwd, filename);
  const env = options.env ?? process.env;

  let source: string;

  try {
    source = await readFile(configPath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      if (!options.fallbackFilename) {
        throw new ConfigError(
          `Configuração não encontrada em ${configPath}. Copie config.example.toml para config.toml e preencha os valores locais.`,
          configPath,
        );
      }
      const fallbackPath = path.resolve(cwd, options.fallbackFilename);
      try {
        source = await readFile(fallbackPath, "utf8");
      } catch {
        throw new ConfigError(`Configuração não encontrada em ${configPath} nem em ${fallbackPath}.`, configPath);
      }
    } else {
      throw new ConfigError(
        `Não foi possível ler a configuração em ${configPath}. Verifique as permissões do arquivo.`,
        configPath,
      );
    }
  }

  let parsed: unknown;

  try {
    parsed = parse(source);
  } catch {
    throw new ConfigError(
      `O arquivo ${configPath} contém TOML inválido. Revise sua sintaxe sem publicar valores secretos.`,
      configPath,
    );
  }

  const result = configSchema.safeParse(parsed);

  if (!result.success) {
    const invalidFields = [
      ...new Set(
        result.error.issues.map((issue) => issue.path.join(".") || "raiz"),
      ),
    ];

    throw new ConfigError(
      `Configuração inválida em ${configPath}. Revise os campos: ${invalidFields.join(", ")}.`,
      configPath,
    );
  }

  const base = result.data;
  const overridden = {
    ...base,
    server: {
      ...base.server,
      host: env.SERVER_HOST ?? base.server.host,
      port: env.PORT ? Number(env.PORT) : base.server.port,
    },
    database: { ...base.database, path: env.DATABASE_PATH ?? base.database.path },
    images: { ...base.images, directory: env.IMAGES_DIRECTORY ?? base.images.directory },
    openai: { ...base.openai, api_key: env.OPENAI_API_KEY ?? base.openai.api_key },
    generation: { ...base.generation, provider: env.GENERATION_PROVIDER ?? base.generation.provider },
  };
  const finalResult = configSchema.safeParse(overridden);
  if (!finalResult.success) {
    const fields = [...new Set(finalResult.error.issues.map((issue) => issue.path.join(".") || "raiz"))];
    throw new ConfigError(`Configuração de ambiente inválida. Revise: ${fields.join(", ")}.`, configPath);
  }
  return finalResult.data;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
