import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./load.js";
import { createSafeConfigSummary } from "./schema.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("loadConfig", () => {
  it("loads and validates a complete TOML file", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(directory, validConfig());

    const config = await loadConfig({ cwd: directory });

    expect(config.server).toEqual({ host: "127.0.0.1", port: 3000 });
    expect(config.openai.text_model).toBe("gpt-6-luna");
    expect(config.generation.image_count).toBe(1);
  });

  it("explains how to create a missing local configuration", async () => {
    const directory = await createTemporaryDirectory();

    await expect(loadConfig({ cwd: directory })).rejects.toThrow(
      /Copie config\.example\.toml para config\.toml/,
    );
  });

  it("reports invalid field paths without exposing their values", async () => {
    const directory = await createTemporaryDirectory();
    const secret = "esta-chave-nao-pode-aparecer-no-erro";
    await writeConfig(
      directory,
      validConfig()
        .replace("sk-proj-chave-local-de-teste-123456", secret)
        .replace("port = 3000", "port = 70000")
        .replace('provider = "mock"', 'provider = "openai"'),
    );

    const error = await loadConfig({ cwd: directory }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ConfigError);
    expect(String(error)).toContain("server.port");
    expect(String(error)).toContain("openai.api_key");
    expect(String(error)).not.toContain(secret);
  });

  it("redacts the API key from safe summaries", async () => {
    const directory = await createTemporaryDirectory();
    const secret = "sk-proj-chave-local-de-teste-123456";
    await writeConfig(directory, validConfig());

    const config = await loadConfig({ cwd: directory });
    const summary = createSafeConfigSummary(config);

    expect(summary.openai.api_key).toBe("[REDACTED]");
    expect(JSON.stringify(summary)).not.toContain(secret);
  });

  it("requires an API key only when the OpenAI provider is active", async () => {
    const directory = await createTemporaryDirectory();
    await writeConfig(
      directory,
      validConfig()
        .replace(
          'api_key = "sk-proj-chave-local-de-teste-123456"',
          'api_key = ""',
        )
        .replace('provider = "mock"', 'provider = "openai"'),
    );

    await expect(loadConfig({ cwd: directory })).rejects.toThrow(
      /openai\.api_key/,
    );

    await writeConfig(
      directory,
      validConfig().replace(
        'api_key = "sk-proj-chave-local-de-teste-123456"',
        'api_key = ""',
      ),
    );
    await expect(loadConfig({ cwd: directory })).resolves.toMatchObject({
      generation: { provider: "mock" },
    });
  });
});

async function createTemporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "fabrica-config-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeConfig(directory: string, contents: string) {
  await writeFile(path.join(directory, "config.toml"), contents, "utf8");
}

function validConfig() {
  return `
[server]
host = "127.0.0.1"
port = 3000

[database]
path = "./data/database.sqlite"

[openai]
api_key = "sk-proj-chave-local-de-teste-123456"
text_model = "gpt-6-luna"
image_model = "gpt-image-2.5-flare"
reasoning_effort = "low"
image_quality = "low"
timeout_seconds = 120
max_retries = 1
max_output_tokens = 8000

[generation]
provider = "mock"
suspect_count = 3
document_count = 4
image_count = 1
max_case_generations_per_hour = 5
`;
}
