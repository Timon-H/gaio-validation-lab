-- ============================================
-- GAIO Validation Lab — Supabase Schema
-- ============================================
-- Run this in the Supabase SQL Editor to create the required tables.
-- These tables support bot visit logging and content extraction testing.

-- 1. Bot visit logs (populated by middleware.ts)
CREATE TABLE IF NOT EXISTS bot_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),
  bot_name      TEXT NOT NULL,           -- 'ChatGPT', 'Claude', 'Gemini', etc.
  test_group    TEXT NOT NULL,           -- path segment: 'control', 'combined', 'test-jsonld', etc.
  path          TEXT NOT NULL,           -- full path: '/test-jsonld'
  user_agent    TEXT,
  method        TEXT DEFAULT 'GET',
  status        INT,
  latency_ms    INT
);

-- Index for fast queries by bot + group
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_group 
  ON bot_logs (bot_name, test_group);

-- Index for time-series analytics
CREATE INDEX IF NOT EXISTS idx_bot_logs_created 
  ON bot_logs (created_at DESC);

-- 2. Content extraction results (populated by test script or manual entry)
-- Stores what a crawler/LLM actually "saw" on each page variant
CREATE TABLE IF NOT EXISTS extraction_results (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),
  test_group    TEXT NOT NULL,           -- path segment
  extractor     TEXT NOT NULL,           -- 'curl', 'puppeteer', 'gptbot-sim', 'lighthouse'
  content_hash  TEXT,                    -- SHA256 of extracted text for dedup
  text_content  TEXT,                    -- full text content extracted
  json_ld       JSONB,                   -- parsed JSON-LD found on the page
  heading_count INT DEFAULT 0,           -- number of headings found
  link_count    INT DEFAULT 0,           -- number of links found
  word_count    INT DEFAULT 0,           -- number of words in text content
  has_noscript  BOOLEAN DEFAULT FALSE,   -- whether <noscript> content was present
  has_aria      BOOLEAN DEFAULT FALSE,   -- whether aria-label/aria-labelledby found
  has_semantic  BOOLEAN DEFAULT FALSE,   -- whether <section>/<article> found
  has_jsonld    BOOLEAN DEFAULT FALSE,   -- whether JSON-LD script tag found
  has_microdata BOOLEAN DEFAULT FALSE,  -- whether microdata (itemscope/itemtype) found
  has_dsd       BOOLEAN DEFAULT FALSE    -- whether <template shadowrootmode> found
);

CREATE INDEX IF NOT EXISTS idx_extraction_group 
  ON extraction_results (test_group);

-- 3. Simplified analytics view for quick comparison
CREATE OR REPLACE VIEW gaio_comparison AS
SELECT 
  test_group,
  COUNT(*) AS total_visits,
  COUNT(*) FILTER (WHERE bot_name != 'Unknown') AS bot_visits,
  ROUND(AVG(latency_ms)::numeric, 1) AS avg_latency_ms,
  array_agg(DISTINCT bot_name) FILTER (WHERE bot_name != 'Unknown') AS bots_seen
FROM bot_logs
GROUP BY test_group
ORDER BY test_group;

-- 4. LLM evaluation results (populated by evaluate.mjs --persist)
-- Stores structured extraction output per variant and provider run
CREATE TABLE IF NOT EXISTS llm_evaluation_results (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at           TIMESTAMPTZ DEFAULT now(),
  provider             TEXT NOT NULL,           -- 'openai', 'claude', 'gemini'
  model                TEXT NOT NULL,           -- exact model name used
  variant_id           TEXT NOT NULL,           -- 'control', 'jsonld', 'combined', etc.
  run                  INT NOT NULL DEFAULT 1,  -- repetition index (1-based)
  tarife_count         INT DEFAULT 0,
  faq_count            INT DEFAULT 0,
  produktkarten_count  INT DEFAULT 0,
  form_felder_count    INT DEFAULT 0,
  hat_kontakt          BOOLEAN DEFAULT FALSE,
  hat_anbieter         BOOLEAN DEFAULT FALSE,
  raw_output           JSONB                    -- full parsed extraction JSON
);

CREATE INDEX IF NOT EXISTS idx_llm_eval_provider_variant
  ON llm_evaluation_results (provider, variant_id);

CREATE INDEX IF NOT EXISTS idx_llm_eval_created
  ON llm_evaluation_results (created_at DESC);

-- Comparison view: aggregate per provider × variant
-- Use this in the Supabase Table Editor "Views" tab or query it via REST as
--   GET /rest/v1/llm_eval_comparison?select=*
CREATE OR REPLACE VIEW llm_eval_comparison AS
SELECT
  variant_id,
  provider,
  model,
  COUNT(*)                                                  AS runs,
  ROUND(AVG(tarife_count)::numeric,        2)               AS avg_tarife,
  ROUND(AVG(faq_count)::numeric,           2)               AS avg_faq,
  ROUND(AVG(produktkarten_count)::numeric, 2)               AS avg_produktkarten,
  ROUND(AVG(form_felder_count)::numeric,   2)               AS avg_form_felder,
  ROUND(100.0 * SUM(hat_kontakt::int)  / COUNT(*), 0)       AS pct_kontakt,
  ROUND(100.0 * SUM(hat_anbieter::int) / COUNT(*), 0)       AS pct_anbieter,
  MAX(created_at)                                           AS last_run_at
FROM llm_evaluation_results
GROUP BY variant_id, provider, model
ORDER BY variant_id, provider;

ALTER TABLE llm_evaluation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert" ON llm_evaluation_results
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read" ON llm_evaluation_results
  FOR SELECT TO anon USING (true);

-- 5. Row-level security
-- NOTE: Intentionally permissive (WITH CHECK (true) / USING (true)).
-- This is a thesis validation lab — not a production system.
-- The data (bot visit logs, extraction markers) is non-sensitive and
-- append-only by design. The anon key is used by both the Astro
-- middleware (bot_logs INSERT) and the extraction test script
-- (extraction_results INSERT). No UPDATE/DELETE policies exist,
-- so the tables are effectively append-only even without auth.
-- For a production system: restrict INSERT to authenticated roles,
-- add rate-limiting via pg_net or Edge Function middleware, and
-- scope SELECT to the owning organization.
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

-- Allow insert from anon key (middleware uses anon key)
CREATE POLICY "Allow anon insert" ON bot_logs 
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read" ON bot_logs 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert" ON extraction_results 
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read" ON extraction_results 
  FOR SELECT TO anon USING (true);
