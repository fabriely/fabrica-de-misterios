import type { Migration } from "../migrate.js";
export const insightsAndJuryMigration: Migration = {
  version: 6,
  name: "ai_operations_quality_and_judgments",
  sql: `
    CREATE TABLE ai_operations (
      id TEXT PRIMARY KEY, case_id TEXT, premise_set_id TEXT,
      stage TEXT NOT NULL, operation_json TEXT NOT NULL,
      FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
    );
    CREATE INDEX ai_operations_case_id_idx ON ai_operations(case_id);
    CREATE INDEX ai_operations_premise_set_id_idx ON ai_operations(premise_set_id);
    CREATE TABLE case_quality_reviews (
      case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
      review_json TEXT NOT NULL
    );
    CREATE TABLE accusation_judgments (
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      suspect_id TEXT NOT NULL,
      argument TEXT NOT NULL,
      judgment_json TEXT,
      PRIMARY KEY (case_id, player_id),
      FOREIGN KEY (case_id, player_id) REFERENCES accusations(case_id, player_id) ON DELETE CASCADE
    );
  `,
};
