import type { Migration } from "../migrate.js";

export const generationMetadataMigration: Migration = {
  version: 2,
  name: "generation_metadata",
  sql: `
    ALTER TABLE cases ADD COLUMN generation_provider TEXT;
    ALTER TABLE cases ADD COLUMN openai_response_id TEXT;
    ALTER TABLE cases ADD COLUMN usage_json TEXT;
  `,
};
