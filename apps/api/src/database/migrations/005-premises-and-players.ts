import type { Migration } from "../migrate.js";

export const premisesAndPlayersMigration: Migration = {
  version: 5,
  name: "premises_and_independent_players",
  sql: `
    CREATE TABLE premise_sets (
      id TEXT PRIMARY KEY,
      briefing_json TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX premise_sets_created_at_idx ON premise_sets(created_at);
    ALTER TABLE cases ADD COLUMN selected_premise_json TEXT;

    CREATE TABLE accusations_new (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      suspect_name TEXT NOT NULL,
      normalized_suspect_name TEXT NOT NULL,
      correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
      result_json TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      UNIQUE (case_id, player_id),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );
    INSERT INTO accusations_new (
      id, case_id, player_id, suspect_name, normalized_suspect_name,
      correct, result_json, submitted_at
    ) SELECT id, case_id, 'legacy', suspect_name, normalized_suspect_name,
      correct, result_json, submitted_at FROM accusations;
    DROP TABLE accusations;
    ALTER TABLE accusations_new RENAME TO accusations;
    CREATE INDEX accusations_submitted_at_idx ON accusations(submitted_at);
  `,
};
