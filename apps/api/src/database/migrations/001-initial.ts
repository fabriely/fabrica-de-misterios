import type { Migration } from "../migrate.js";

export const initialMigration: Migration = {
  version: 1,
  name: "initial_cases_and_accusations",
  sql: `
    CREATE TABLE cases (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (
        status IN ('queued', 'generating_case', 'generating_image', 'ready', 'failed')
      ),
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      briefing_json TEXT NOT NULL,
      draft_public_case_json TEXT,
      public_case_json TEXT,
      private_solution_json TEXT,
      image_prompt TEXT,
      error_message TEXT,
      text_model TEXT,
      prompt_version TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX cases_status_idx ON cases(status);
    CREATE INDEX cases_created_at_idx ON cases(created_at);

    CREATE TABLE accusations (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL UNIQUE,
      suspect_name TEXT NOT NULL,
      normalized_suspect_name TEXT NOT NULL,
      correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
      result_json TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE INDEX accusations_submitted_at_idx ON accusations(submitted_at);
  `,
};
