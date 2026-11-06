import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { runMigrations } from "./migrate.js";

export type OpenDatabaseOptions = {
  filename: string;
  baseDirectory?: string;
};

export type OpenDatabaseResult = {
  database: Database.Database;
  filename: string;
  schemaVersion: number;
};

export function openDatabase({
  filename,
  baseDirectory = process.cwd(),
}: OpenDatabaseOptions): OpenDatabaseResult {
  const resolvedFilename =
    filename === ":memory:" ? filename : path.resolve(baseDirectory, filename);

  if (resolvedFilename !== ":memory:") {
    mkdirSync(path.dirname(resolvedFilename), { recursive: true });
  }

  const database = new Database(resolvedFilename);
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");

  if (resolvedFilename !== ":memory:") {
    database.pragma("journal_mode = WAL");
  }

  const schemaVersion = runMigrations(database);

  return {
    database,
    filename: resolvedFilename,
    schemaVersion,
  };
}
