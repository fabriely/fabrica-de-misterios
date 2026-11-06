import type { Migration } from "../migrate.js";

export const imageMetadataMigration: Migration = {
  version: 3,
  name: "image_metadata",
  sql: `
    ALTER TABLE cases ADD COLUMN image_provider TEXT;
    ALTER TABLE cases ADD COLUMN image_model TEXT;
    ALTER TABLE cases ADD COLUMN image_usage_json TEXT;
    ALTER TABLE cases ADD COLUMN image_file_path TEXT;
    ALTER TABLE cases ADD COLUMN image_is_fallback INTEGER NOT NULL DEFAULT 0;
  `,
};
