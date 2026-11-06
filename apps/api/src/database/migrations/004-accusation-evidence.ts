import type { Migration } from "../migrate.js";

export const accusationEvidenceMigration: Migration = {
  version: 4,
  name: "accusation_decisive_evidence",
  sql: `
    UPDATE accusations
    SET result_json = json_set(
      result_json,
      '$.decisiveEvidenceIds',
      json((
        SELECT json_extract(cases.private_solution_json, '$.decisiveEvidenceIds')
        FROM cases
        WHERE cases.id = accusations.case_id
      ))
    )
    WHERE json_type(result_json, '$.decisiveEvidenceIds') IS NULL;
  `,
};
