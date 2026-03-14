-- Adds thinking_controls metadata to llm_evaluation_results,
-- backfills existing rows, and updates llm_eval_comparison grouping.

BEGIN;

ALTER TABLE llm_evaluation_results
  ADD COLUMN IF NOT EXISTS thinking_controls TEXT;

ALTER TABLE llm_evaluation_results
  ALTER COLUMN thinking_controls
  SET DEFAULT 'profile=provider-default';

UPDATE llm_evaluation_results
SET thinking_controls = CASE
  WHEN provider = 'openai' AND model IN ('gpt-5', 'gpt-5-mini')
    THEN 'profile=provider-default;api=responses;reasoning.effort=low;text.format=json_object;temperature/seed=unsupported'
  WHEN provider = 'openai'
    THEN 'profile=provider-default;api=chat.completions;temperature=0.0;seed=42;response_format=json_object'
  WHEN provider = 'claude'
    THEN 'profile=provider-default;api=messages;temperature=0.0;thinking=not_enabled;json_prefill={'
  WHEN provider = 'gemini'
    THEN 'profile=provider-default;api=generateContent;temperature=0.0;responseMimeType=application/json;seed=not_set;thinkingBudget=not_set'
  ELSE 'profile=provider-default'
END
WHERE
  thinking_controls IS NULL
  OR thinking_controls = ''
  OR thinking_controls LIKE 'legacy-assumed;%'
  OR thinking_controls LIKE 'profile=unknown%'
  OR thinking_controls LIKE '%;profile=unknown%';

ALTER TABLE llm_evaluation_results
  ALTER COLUMN thinking_controls
  SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_llm_eval_tier_thinking_created
  ON llm_evaluation_results (tier, thinking_controls, created_at DESC);

CREATE OR REPLACE VIEW llm_eval_comparison AS
SELECT
  variant_id,
  provider,
  model,
  tier,
  COALESCE(NULLIF(substring(thinking_controls FROM 'profile=([^;]+)'), ''), 'unknown') AS thinking_profile,
  COUNT(*) AS runs,
  ROUND(AVG(tarife_count)::numeric, 2) AS avg_tarife,
  ROUND(AVG(faq_count)::numeric, 2) AS avg_faq,
  ROUND(AVG(produktkarten_count)::numeric, 2) AS avg_produktkarten,
  ROUND(AVG(form_felder_count)::numeric, 2) AS avg_form_felder,
  ROUND(100.0 * SUM(hat_kontakt::int) / COUNT(*), 0) AS pct_kontakt,
  ROUND(100.0 * SUM(hat_anbieter::int) / COUNT(*), 0) AS pct_anbieter,
  MAX(created_at) AS last_run_at
FROM llm_evaluation_results
GROUP BY
  variant_id,
  provider,
  model,
  tier,
  COALESCE(NULLIF(substring(thinking_controls FROM 'profile=([^;]+)'), ''), 'unknown')
ORDER BY variant_id, provider, model, tier, thinking_profile;

COMMIT;

-- Optional validation checks:
-- SELECT COUNT(*) AS missing_thinking_controls
-- FROM llm_evaluation_results
-- WHERE thinking_controls IS NULL OR thinking_controls = '';
--
-- SELECT *
-- FROM llm_eval_comparison
-- ORDER BY variant_id, provider, model, tier, thinking_profile;
