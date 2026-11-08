import type Database from "better-sqlite3";
import {
  accusationRecordSchema,
  accusationResultSchema,
} from "@fabrica/contracts";
import type {
  AccusationRecord,
  AccusationResult,
} from "@fabrica/contracts";
import { AccusationAlreadyExistsError } from "./errors.js";
import { parseStoredJson } from "./json.js";

type AccusationRow = {
  id: string;
  case_id: string;
  suspect_name: string;
  normalized_suspect_name: string;
  correct: 0 | 1;
  result_json: string;
  submitted_at: string;
};

export type StoredAccusation = {
  record: AccusationRecord;
  result: AccusationResult;
};

export class AccusationRepository {
  constructor(private readonly database: Database.Database) {}

  submit(
    recordInput: AccusationRecord,
    resultInput: AccusationResult,
  ): StoredAccusation {
    const record = accusationRecordSchema.parse(recordInput);
    const result = accusationResultSchema.parse(resultInput);
    this.assertConsistent(record, result);

    try {
      this.database
        .prepare(
          `INSERT INTO accusations (
            id, case_id, suspect_name, normalized_suspect_name,
            correct, result_json, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          record.id,
          record.caseId,
          record.suspectName,
          record.normalizedSuspectName,
          record.correct ? 1 : 0,
          JSON.stringify(result),
          record.submittedAt,
        );
    } catch (error) {
      if (isSqliteConstraint(error)) {
        throw new AccusationAlreadyExistsError(record.caseId);
      }
      throw error;
    }

    return { record, result };
  }

  findByCaseId(caseId: string): StoredAccusation | null {
    const row = this.database
      .prepare("SELECT * FROM accusations WHERE case_id = ?")
      .get(caseId) as AccusationRow | undefined;
    if (!row) return null;

    return {
      record: accusationRecordSchema.parse({
        id: row.id,
        caseId: row.case_id,
        suspectName: row.suspect_name,
        normalizedSuspectName: row.normalized_suspect_name,
        submittedAt: row.submitted_at,
        correct: row.correct === 1,
      }),
      result: parseStoredJson(
        row.result_json,
        accusationResultSchema,
        "resultado da acusação",
        row.id,
      ),
    };
  }

  private assertConsistent(
    record: AccusationRecord,
    result: AccusationResult,
  ) {
    if (
      record.caseId !== result.caseId ||
      record.correct !== result.correct ||
      record.suspectName !== result.accusedName ||
      record.submittedAt !== result.submittedAt
    ) {
      throw new Error("Registro e resultado da acusação são inconsistentes.");
    }
  }
}

function isSqliteConstraint(error: unknown): error is { code: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    ["SQLITE_CONSTRAINT_PRIMARYKEY", "SQLITE_CONSTRAINT_UNIQUE"].includes(
      error.code,
    )
  );
}
