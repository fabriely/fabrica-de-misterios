import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

if (!url) {
  throw new Error("Defina DATABASE_URL_UNPOOLED antes de executar a migração.");
}

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
  image_review_state TEXT NOT NULL DEFAULT 'pending',
  image_retry_count INTEGER NOT NULL DEFAULT 0,
  candidate_scene_url TEXT,
  candidate_portraits_url TEXT,
  image_review_feedback TEXT,
  image_review_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_review_claim_id UUID,
  image_review_claimed_at TIMESTAMPTZ,
  quality_claim_id UUID,
  quality_claimed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS generation_claim_id UUID`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_claim_id UUID`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_review_state TEXT NOT NULL DEFAULT 'pending'`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_retry_count INTEGER NOT NULL DEFAULT 0`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS candidate_scene_url TEXT`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS candidate_portraits_url TEXT`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_review_feedback TEXT`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_review_json JSONB NOT NULL DEFAULT '[]'::jsonb`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_review_claim_id UUID`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS image_review_claimed_at TIMESTAMPTZ`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS quality_claim_id UUID`);
await sql.query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS quality_claimed_at TIMESTAMPTZ`);
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
await sql.query(`CREATE TABLE IF NOT EXISTS ai_operations (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  premise_set_id UUID,
  stage TEXT NOT NULL,
  operation_json JSONB NOT NULL
)`);
await sql.query(`CREATE INDEX IF NOT EXISTS ai_operations_case_idx ON ai_operations(case_id)`);
await sql.query(`CREATE INDEX IF NOT EXISTS ai_operations_premise_idx ON ai_operations(premise_set_id)`);
await sql.query(`CREATE TABLE IF NOT EXISTS case_quality_reviews (
  case_id UUID PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  review_json JSONB NOT NULL
)`);
await sql.query(`CREATE TABLE IF NOT EXISTS accusation_judgments (
  case_id UUID NOT NULL,
  player_id UUID NOT NULL,
  suspect_id TEXT NOT NULL,
  argument TEXT NOT NULL,
  judgment_json JSONB,
  judgment_claim_id UUID,
  claimed_at TIMESTAMPTZ,
  PRIMARY KEY (case_id, player_id),
  FOREIGN KEY (case_id, player_id) REFERENCES accusations(case_id, player_id) ON DELETE CASCADE
)`);
await sql.query(`ALTER TABLE accusation_judgments ADD COLUMN IF NOT EXISTS judgment_claim_id UUID`);
await sql.query(`ALTER TABLE accusation_judgments ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`);
console.log("Estrutura do banco para Vercel pronta.");
