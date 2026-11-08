import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "smol-toml";
import { configSchema } from "./schema.js";
import type { AppConfig } from "./schema.js";

const DEFAULT_CONFIG_FILENAME = "config.toml";

type LoadConfigOptions = {
  cwd?: string;
  filename?: string;
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

  let source: string;

  try {
    source = await readFile(configPath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new ConfigError(
        `Configuração não encontrada em ${configPath}. Copie config.example.toml para config.toml e preencha os valores locais.`,
        configPath,
      );
    }

    throw new ConfigError(
      `Não foi possível ler a configuração em ${configPath}. Verifique as permissões do arquivo.`,
      configPath,
    );
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

  return result.data;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
