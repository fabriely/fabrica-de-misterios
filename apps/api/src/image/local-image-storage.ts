import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { caseIdSchema } from "@fabrica/contracts";
import type { AppConfig } from "../config/index.js";
import type { GeneratedImage, ImageStorage, StoredImage } from "./types.js";

type StorageConfig = Pick<AppConfig["images"], "directory" | "public_path">;

export class LocalImageStorage implements ImageStorage {
  private readonly directory: string;
  private readonly publicPath: string;

  constructor(config: StorageConfig, cwd = process.cwd()) {
    this.directory = path.resolve(cwd, config.directory);
    this.publicPath = `/${config.public_path.replace(/^\/+|\/+$/g, "")}`;
  }

  async save(caseIdInput: string, image: GeneratedImage, kind: "scene" | "portraits" = "scene"): Promise<StoredImage> {
    const caseId = caseIdSchema.parse(caseIdInput);
    await mkdir(this.directory, { recursive: true });

    const filename = `${caseId}${kind === "portraits" ? "-portraits" : ""}.${image.extension}`;
    const filePath = path.join(this.directory, filename);
    const temporaryPath = path.join(
      this.directory,
      `.${caseId}.${randomUUID()}.tmp`,
    );

    try {
      await writeFile(temporaryPath, image.bytes, { flag: "wx" });
      await rename(temporaryPath, filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }

    return {
      filePath,
      publicUrl: `${this.publicPath}/${filename}`,
    };
  }
}
