# Database Usage

This project uses Supabase for four data streams:

- `bot_logs`: middleware crawler visits and latency
- `extraction_results`: structural extraction smoke test rows
- `llm_evaluation_results`: LLM extraction benchmark rows
- `llm_evaluation_results_exploratory`: exploratory visibility-axis LLM benchmark rows

The schema is defined in [supabase/schema.sql](../supabase/schema.sql).

## 1. Initialize or Reset Schema

Run the full SQL file in Supabase SQL Editor:

1. Open Supabase Dashboard -> SQL Editor.
2. Paste [supabase/schema.sql](../supabase/schema.sql).
3. Execute.

The current schema is a full reset script (drops and recreates tables, enums, and views).

## 2. Canonical Variant IDs

All tables use canonical variant IDs via enum `gaio_variant`:

- `control`
- `jsonld`
- `semantic`
- `aria`
- `noscript`
- `dsd`
- `microdata`
- `combined`

Canonical IDs come from `VARIANTS` in [src/data/variants.mjs](../src/data/variants.mjs).

Exploratory evaluator routes (`combined-dsd`, `combined-noscript`) are defined in `EXPLORATORY_VARIANTS` and remain outside this enum. They are persisted separately in `llm_evaluation_results_exploratory` via `--persist-exploratory`.

## 3. Writers and Required Payloads

### Middleware -> `bot_logs`

Source: [src/middleware.ts](../src/middleware.ts)

Key fields written:

- `variant_id`
- `path`
- `bot_name`
- `user_agent`
- `method`
- `status`
- `latency_ms`

### Extraction script -> `extraction_results`

Source: [scripts/test-extract.mjs](../scripts/test-extract.mjs)

Key fields written:

- `variant_id`
- `extractor`
- `request_url`
- `base_url`
- `content_hash`
- `text_content`
- marker booleans (`has_jsonld`, `has_noscript`, `has_dsd`, `has_microdata`, etc.)

### Evaluation script -> `llm_evaluation_results` and `llm_evaluation_results_exploratory`

Source: [scripts/evaluate.mjs](../scripts/evaluate.mjs)

Persistence routing:

- `--persist` -> `llm_evaluation_results` (canonical variants only)
- `--persist-exploratory` -> `llm_evaluation_results_exploratory` (exploratory visibility variants only)

Key fields written:

- `provider`
- `model`
- `tier`
- `thinking_controls`
- `variant_id`
- `run`
- `base_url`
- extraction counts
- `hat_kontakt`, `hat_anbieter`
- `raw_output`

## 4. Views

### `gaio_comparison`

Aggregates crawler visits per variant.

```sql
SELECT *
FROM gaio_comparison
ORDER BY variant_id;
```

### `extraction_comparison`

Aggregates structural extraction markers per variant and extractor.

```sql
SELECT *
FROM extraction_comparison
ORDER BY variant_id, extractor;
```

### `llm_eval_comparison`

Aggregates LLM benchmark results per variant/provider/model/tier/thinking profile.

```sql
SELECT *
FROM llm_eval_comparison
ORDER BY variant_id, provider, model, tier, thinking_profile;
```

### `llm_eval_comparison_exploratory`

Aggregates exploratory visibility-axis LLM benchmark results (combined-dsd vs combined-noscript).

```sql
SELECT *
FROM llm_eval_comparison_exploratory
ORDER BY variant_id, provider, model, tier, thinking_profile;
```

## 5. Quick End-to-End Checks

Run these after schema setup:

```bash
npm run test:extract:persist
npm run evaluate:openai -- --persist --variant control --repetitions 1
npm run evaluate:all -- --variant-set combined-visibility --persist-exploratory --tier validation --repetitions 1
```

Then validate rows:

```sql
SELECT created_at, variant_id, extractor
FROM extraction_results
ORDER BY created_at DESC
LIMIT 10;

SELECT created_at, provider, model, tier, variant_id, run
FROM llm_evaluation_results
ORDER BY created_at DESC
LIMIT 10;

SELECT created_at, provider, model, tier, thinking_controls, variant_id, run
FROM llm_evaluation_results
ORDER BY created_at DESC
LIMIT 10;

SELECT created_at, provider, model, tier, thinking_controls, variant_id, run
FROM llm_evaluation_results_exploratory
ORDER BY created_at DESC
LIMIT 10;
```

## 6. Notes

- RLS is enabled with permissive anon insert/select policies for this lab environment.
- The `meta` column on all four tables defaults to `{}` and can be used for future annotations without schema changes.
- If inserts fail after schema changes, first confirm your Supabase project actually ran the latest [supabase/schema.sql](../supabase/schema.sql).
- Exploratory visibility runs do not require enum changes: use `--persist-exploratory`, which writes to `llm_evaluation_results_exploratory`.
