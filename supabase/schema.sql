-- ============================================
-- GAIO Validation Lab — Supabase Schema (v2)
-- ============================================
--
-- This script intentionally resets the lab schema and recreates it with:
-- - canonical variant IDs (control/jsonld/semantic/aria/noscript/dsd/microdata/combined)
-- - stronger constraints and indexes
-- - analytics views optimized for the current scripts
--
-- WARNING: Destructive reset for lab environments.

-- --------------------------------------------------------------------------
-- 0) Reset existing objects
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS llm_eval_comparison;
DROP VIEW IF EXISTS extraction_comparison;
DROP VIEW IF EXISTS gaio_comparison;

DROP TABLE IF EXISTS llm_evaluation_results;
DROP TABLE IF EXISTS extraction_results;
DROP TABLE IF EXISTS bot_logs;

DROP TYPE IF EXISTS gaio_provider;
DROP TYPE IF EXISTS gaio_variant;

-- --------------------------------------------------------------------------
-- 1) Shared enums
-- --------------------------------------------------------------------------
CREATE TYPE gaio_variant AS ENUM (
  'control',
  'jsonld',
  'semantic',
  'aria',
  'noscript',
  'dsd',
  'microdata',
  'combined'
);

CREATE TYPE gaio_provider AS ENUM (
  'openai',
  'claude',
  'gemini'
);

-- --------------------------------------------------------------------------
-- 2) Bot visit logs (middleware.ts)
-- --------------------------------------------------------------------------
CREATE TABLE bot_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  variant_id  gaio_variant NOT NULL,
  path        TEXT NOT NULL,
  bot_name    TEXT NOT NULL,
  user_agent  TEXT NOT NULL DEFAULT '',
  method      TEXT NOT NULL DEFAULT 'GET',
  status      INT NOT NULL CHECK (status BETWEEN 100 AND 599),
  latency_ms  INT NOT NULL CHECK (latency_ms >= 0),
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_bot_logs_variant_bot_created
  ON bot_logs (variant_id, bot_name, created_at DESC);

CREATE INDEX idx_bot_logs_path_created
  ON bot_logs (path, created_at DESC);

CREATE INDEX idx_bot_logs_created
  ON bot_logs (created_at DESC);

-- --------------------------------------------------------------------------
-- 3) Extraction runs (scripts/test-extract.mjs)
-- --------------------------------------------------------------------------
CREATE TABLE extraction_results (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  variant_id    gaio_variant NOT NULL,
  extractor     TEXT NOT NULL,
  request_url   TEXT NOT NULL,
  base_url      TEXT NOT NULL,
  content_hash  TEXT NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  text_content  TEXT,
  json_ld       JSONB,
  heading_count INT NOT NULL DEFAULT 0 CHECK (heading_count >= 0),
  link_count    INT NOT NULL DEFAULT 0 CHECK (link_count >= 0),
  word_count    INT NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  has_noscript  BOOLEAN NOT NULL DEFAULT FALSE,
  has_aria      BOOLEAN NOT NULL DEFAULT FALSE,
  has_semantic  BOOLEAN NOT NULL DEFAULT FALSE,
  has_jsonld    BOOLEAN NOT NULL DEFAULT FALSE,
  has_microdata BOOLEAN NOT NULL DEFAULT FALSE,
  has_dsd       BOOLEAN NOT NULL DEFAULT FALSE,
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_extraction_variant_extractor_created
  ON extraction_results (variant_id, extractor, created_at DESC);

CREATE INDEX idx_extraction_content_hash
  ON extraction_results (content_hash);

CREATE INDEX idx_extraction_created
  ON extraction_results (created_at DESC);

-- --------------------------------------------------------------------------
-- 4) LLM evaluation rows (scripts/evaluate.mjs --persist)
-- --------------------------------------------------------------------------
CREATE TABLE llm_evaluation_results (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider             gaio_provider NOT NULL,
  model                TEXT NOT NULL,
  tier                 TEXT NOT NULL,
  variant_id           gaio_variant NOT NULL,
  run                  INT NOT NULL CHECK (run >= 1),
  base_url             TEXT NOT NULL,
  tarife_count         INT NOT NULL DEFAULT 0 CHECK (tarife_count >= 0),
  faq_count            INT NOT NULL DEFAULT 0 CHECK (faq_count >= 0),
  produktkarten_count  INT NOT NULL DEFAULT 0 CHECK (produktkarten_count >= 0),
  form_felder_count    INT NOT NULL DEFAULT 0 CHECK (form_felder_count >= 0),
  hat_kontakt          BOOLEAN NOT NULL DEFAULT FALSE,
  hat_anbieter         BOOLEAN NOT NULL DEFAULT FALSE,
  raw_output           JSONB,
  meta                 JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_llm_eval_variant_provider_model_created
  ON llm_evaluation_results (variant_id, provider, model, created_at DESC);

CREATE INDEX idx_llm_eval_provider_variant_run
  ON llm_evaluation_results (provider, variant_id, run);

CREATE INDEX idx_llm_eval_created
  ON llm_evaluation_results (created_at DESC);

-- --------------------------------------------------------------------------
-- 5) Analytics views
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW gaio_comparison AS
SELECT
  variant_id,
  COUNT(*) AS total_visits,
  COUNT(*) FILTER (WHERE bot_name <> 'Unknown') AS bot_visits,
  ROUND(AVG(latency_ms)::numeric, 1) AS avg_latency_ms,
  array_agg(DISTINCT bot_name ORDER BY bot_name) FILTER (WHERE bot_name <> 'Unknown') AS bots_seen,
  MAX(created_at) AS last_seen_at
FROM bot_logs
GROUP BY variant_id
ORDER BY variant_id;

CREATE OR REPLACE VIEW extraction_comparison AS
SELECT
  variant_id,
  extractor,
  COUNT(*) AS runs,
  ROUND(AVG(word_count)::numeric, 1) AS avg_words,
  ROUND(AVG(heading_count)::numeric, 1) AS avg_headings,
  ROUND(AVG(link_count)::numeric, 1) AS avg_links,
  ROUND(100.0 * SUM(has_jsonld::int) / COUNT(*), 1) AS pct_jsonld,
  ROUND(100.0 * SUM(has_aria::int) / COUNT(*), 1) AS pct_aria,
  ROUND(100.0 * SUM(has_semantic::int) / COUNT(*), 1) AS pct_semantic,
  ROUND(100.0 * SUM(has_noscript::int) / COUNT(*), 1) AS pct_noscript,
  ROUND(100.0 * SUM(has_dsd::int) / COUNT(*), 1) AS pct_dsd,
  ROUND(100.0 * SUM(has_microdata::int) / COUNT(*), 1) AS pct_microdata,
  MAX(created_at) AS last_run_at
FROM extraction_results
GROUP BY variant_id, extractor
ORDER BY variant_id, extractor;

CREATE OR REPLACE VIEW llm_eval_comparison AS
SELECT
  variant_id,
  provider,
  model,
  tier,
  COUNT(*) AS runs,
  ROUND(AVG(tarife_count)::numeric, 2) AS avg_tarife,
  ROUND(AVG(faq_count)::numeric, 2) AS avg_faq,
  ROUND(AVG(produktkarten_count)::numeric, 2) AS avg_produktkarten,
  ROUND(AVG(form_felder_count)::numeric, 2) AS avg_form_felder,
  ROUND(100.0 * SUM(hat_kontakt::int) / COUNT(*), 0) AS pct_kontakt,
  ROUND(100.0 * SUM(hat_anbieter::int) / COUNT(*), 0) AS pct_anbieter,
  MAX(created_at) AS last_run_at
FROM llm_evaluation_results
GROUP BY variant_id, provider, model, tier
ORDER BY variant_id, provider, model, tier;

-- --------------------------------------------------------------------------
-- 6) RLS (permissive by design for lab environment)
-- --------------------------------------------------------------------------
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_evaluation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY bot_logs_anon_insert
  ON bot_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY bot_logs_anon_read
  ON bot_logs FOR SELECT TO anon USING (true);

CREATE POLICY extraction_results_anon_insert
  ON extraction_results FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY extraction_results_anon_read
  ON extraction_results FOR SELECT TO anon USING (true);

CREATE POLICY llm_eval_anon_insert
  ON llm_evaluation_results FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY llm_eval_anon_read
  ON llm_evaluation_results FOR SELECT TO anon USING (true);
