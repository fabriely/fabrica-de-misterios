import type Database from "better-sqlite3";
import { initialMigration } from "./migrations/001-initial.js";
import { generationMetadataMigration } from "./migrations/002-generation-metadata.js";
import { imageMetadataMigration } from "./migrations/003-image-metadata.js";
import { accusationEvidenceMigration } from "./migrations/004-accusation-evidence.js";

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

const migrations: Migration[] = [
  initialMigration,
  generationMetadataMigration,
  imageMetadataMigration,
  accusationEvidenceMigration,
];

export function runMigrations(database: Database.Database): number {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = database
    .prepare("SELECT version, name FROM schema_migrations ORDER BY version")
    .all() as Array<{ version: number; name: string }>;
  const applied = new Map(appliedRows.map((row) => [row.version, row.name]));

  for (const migration of [...migrations].sort(
    (left, right) => left.version - right.version,
  )) {
    const appliedName = applied.get(migration.version);

    if (appliedName && appliedName !== migration.name) {
      throw new Error(
        `Migração ${migration.version} já foi aplicada como ${appliedName}, não como ${migration.name}.`,
      );
    }

    if (appliedName) continue;

    database.transaction(() => {
      database.exec(migration.sql);
      database
        .prepare(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
        )
        .run(migration.version, migration.name, new Date().toISOString());
    })();
  }

  return getSchemaVersion(database);
}

export function getSchemaVersion(database: Database.Database): number {
  const row = database
    .prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations")
    .get() as { version: number };

  return row.version;
}
