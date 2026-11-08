import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Defina DATABASE_URL antes de executar a migração.");
const sql = neon(url);

await sql.query(`CREATE TABLE IF NOT EXISTS premise_sets (
  id UUID PRIMARY KEY,
  briefing_json JSONB NOT NULL,
  options_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
await sql.query(`CREATE INDEX IF NOT EXISTS premise_sets_created_at_idx ON premise_sets(created_at)`);

await sql.query(`CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating_case', 'generating_image', 'ready', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  briefing_json JSONB NOT NULL,
  selected_premise_json JSONB NOT NULL,
  draft_public_case_json JSONB,
  public_case_json JSONB,
  private_solution_json JSONB,
  image_prompt TEXT,
  image_claimed_at TIMESTAMPTZ,
  generation_claim_id UUID,
  image_claim_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS generation_claim_id UUID`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_claim_id UUID`);
await sql.query(`CREATE INDEX IF NOT EXISTS cases_created_at_idx ON cases(created_at)`);

await sql.query(`CREATE TABLE IF NOT EXISTS accusations (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  suspect_name TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  result_json JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  UNIQUE (case_id, player_id)
)`);
console.log("Estrutura do banco para Vercel pronta.");
