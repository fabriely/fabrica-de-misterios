import type Database from "better-sqlite3";
import { premiseSetSchema } from "@fabrica/contracts";
import type { PremiseSet } from "@fabrica/contracts";
import { parseStoredJson } from "./json.js";

export class PremiseRepository {
  constructor(private readonly database: Database.Database) {}

  save(input: PremiseSet): PremiseSet {
    const set = premiseSetSchema.parse(input);
    this.database.prepare(
      "INSERT INTO premise_sets (id, briefing_json, options_json, created_at) VALUES (?, ?, ?, ?)",
    ).run(set.id, JSON.stringify(set.briefing), JSON.stringify(set.options), new Date().toISOString());
    return set;
  }

  find(id: string): PremiseSet | null {
    const row = this.database.prepare(
      "SELECT briefing_json, options_json FROM premise_sets WHERE id = ?",
    ).get(id) as { briefing_json: string; options_json: string } | undefined;
    if (!row) return null;
    return premiseSetSchema.parse({
      id,
      briefing: parseStoredJson(row.briefing_json, premiseSetSchema.shape.briefing, "briefing das premissas", id),
      options: parseStoredJson(row.options_json, premiseSetSchema.shape.options, "opções de premissa", id),
    });
  }

  countCreatedSince(isoTimestamp: string): number {
    const row = this.database.prepare("SELECT COUNT(*) AS total FROM premise_sets WHERE created_at >= ?")
      .get(isoTimestamp) as { total: number };
    return row.total;
  }
}
