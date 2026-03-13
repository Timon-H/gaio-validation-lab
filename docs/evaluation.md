# LLM Evaluation

`scripts/evaluate.mjs` runs the structured extraction benchmark against all 8 page variants using a chosen LLM provider. Each run fetches the live HTML and asks the model to extract a fixed set of fields:

- **tarife** — name, price, Deckungssumme, Selbstbeteiligung, payment period, highlighted flag
- **faq** — question + answer pairs
- **produktkarten** — product card entries
- **formFelder** — all recognisable form fields, including ARIA-labelled ones
- **kontakt** — contact details
- **anbieter** — provider name

Results are returned as structured JSON. Because most of these fields live inside Shadow DOM, extraction counts vary across variants — this variance is the primary measurement target.

## Commands

```bash
# Run with a specific provider (primary tier, default)
npm run evaluate:openai
npm run evaluate:claude
npm run evaluate:gemini

# Run all providers with the validation tier
npm run evaluate:all -- --tier validation --repetitions 5

# Run OpenAI exploratory tier (default: GPT-5-mini reasoning model)
npm run evaluate:openai -- --tier exploratory --repetitions 5

# Run OpenAI exploratory tier with full GPT-5
npm run evaluate:openai -- --tier exploratory --model gpt-5 --repetitions 5

# Persist results to Supabase (requires SUPABASE_URL + SUPABASE_ANON_KEY)
npm run evaluate:openai -- --persist
npm run evaluate:claude -- --persist
npm run evaluate:gemini -- --persist
```

Results are always written to `results/gaio_evaluation_<provider>_<model>_<timestamp>.csv`.
CSV rows include `Provider`, `Model`, and `Tier` so local files can be compared across model tiers without relying on the database.
For exploratory OpenAI runs, use `--model gpt-5-mini` (default) or `--model gpt-5` to run each model independently.
With `--persist`, each run is also inserted into the `llm_evaluation_results` Supabase table (including `tier`, `variant_id`, and `base_url`), enabling cross-provider and cross-run comparisons via the `llm_eval_comparison` SQL view.

## Environment Variables

Running the evaluation requires an LLM provider API key. Running with `--persist` additionally requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

| Variable            | Required for     |
| ------------------- | ---------------- |
| `OPENAI_API_KEY`    | OpenAI provider  |
| `ANTHROPIC_API_KEY` | Claude provider  |
| `GEMINI_API_KEY`    | Gemini provider  |
| `SUPABASE_URL`      | `--persist` flag |
| `SUPABASE_ANON_KEY` | `--persist` flag |

Add the relevant keys to your `.env` file. The npm scripts load them automatically via Node's native `--env-file` flag.

## Model Tiers

The evaluation uses a tiered model strategy. Use `--tier <tier>` to select (default: `primary`).

Use `--model <model-id>` only where multiple models are available for that provider+tier. Currently this applies to OpenAI exploratory:

- `gpt-5-mini` (default)
- `gpt-5`

### Primary Tier — `--tier primary`

Cost-effective models with full determinism controls (`temperature: 0.0`, `seed: 42` where supported). Used for the main analysis with 10+ repetitions.

| Provider | Model              | Input/MTok | Output/MTok |
| -------- | ------------------ | ---------- | ----------- |
| OpenAI   | `gpt-4.1-mini`     | $0.40      | $1.60       |
| Claude   | `claude-haiku-4-5` | $1.00      | $5.00       |
| Gemini   | `gemini-2.5-flash` | $0.30      | $2.50       |

### Validation Tier — `--tier validation`

Higher-capability models from each provider, same API surface and determinism controls. Used with fewer repetitions (e.g., 5) to confirm that GAIO measure effects generalise across model capability levels.

| Provider | Model               | Input/MTok | Output/MTok |
| -------- | ------------------- | ---------- | ----------- |
| OpenAI   | `gpt-4.1`           | $2.00      | $8.00       |
| Claude   | `claude-sonnet-4-5` | $3.00      | $15.00      |
| Gemini   | `gemini-2.5-pro`    | $1.25      | $10.00      |

### Exploratory Tier — `--tier exploratory`

OpenAI-only GPT-5 reasoning model probe. Defaults to `gpt-5-mini`; use `--model gpt-5` to run the full model. Uses the Responses API with `reasoning.effort: 'low'` to minimise non-deterministic thinking tokens. Included as a forward-looking supplementary analysis.

| Provider | Model        | Input/MTok | Output/MTok | Determinism                    |
| -------- | ------------ | ---------- | ----------- | ------------------------------ |
| OpenAI   | `gpt-5-mini` | $0.25      | $2.00       | No temp/seed — reasoning model |
| OpenAI   | `gpt-5`      | $1.25      | $10.00      | No temp/seed — reasoning model |

Reasoning models (GPT-5 family, o3, o4-mini) do not support `temperature` or `seed` parameters. They use a separate code path (`callOpenAIReasoning`) that calls the OpenAI Responses API instead of Chat Completions. Claude and Gemini are not available in this tier.

### Recommended Runs for Thesis

| Tier               | Command                                                                                      | Repetitions | Purpose               | Est. Cost        |
| ------------------ | -------------------------------------------------------------------------------------------- | ----------- | --------------------- | ---------------- |
| Primary            | `npm run evaluate:all -- --persist --repetitions 10`                                         | 10          | Main analysis         | ~$5              |
| Validation         | `npm run evaluate:all -- --persist --tier validation --repetitions 5`                        | 5           | Cross-tier robustness | ~$7              |
| Exploratory (mini) | `npm run evaluate:openai -- --persist --tier exploratory --model gpt-5-mini --repetitions 5` | 5           | Reasoning model probe | ~$1              |
| Exploratory (full) | `npm run evaluate:openai -- --persist --tier exploratory --model gpt-5 --repetitions 5`      | 5           | Reasoning model probe | higher than mini |

## Default Models

See "Model Tiers" above. Models are configured in the `TIER_CONFIGS` table in `evaluate.mjs`.

## JSON Enforcement Per Provider

Each provider uses a different mechanism to guarantee JSON output:

| Provider | Mechanism                                                                              |
| -------- | -------------------------------------------------------------------------------------- |
| OpenAI   | `response_format: { type: 'json_object' }`                                             |
| Claude   | Assistant prefilling — message array starts with `{ role: 'assistant', content: '{' }` |
| Gemini   | `responseMimeType: 'application/json'` in generation config                            |

Note: Assistant prefilling is currently compatible with `claude-sonnet-4-5` and `claude-haiku-4-5`. It is not supported on Claude 4.6 models.

All providers use `temperature: 0.0` and, where supported, `seed: 42` for reproducibility.

## Rate Limiting

The script includes `callLLMWithRetry()` which handles 429 responses by parsing the `retryDelay` field from the error JSON and waiting that duration plus a 2-second buffer before retrying.

## Supabase Schema

The `llm_evaluation_results` table stores one row per variant x provider run. The `llm_eval_comparison` view aggregates averages across runs and keeps model tier in the grouping:

```sql
SELECT *
FROM llm_eval_comparison
ORDER BY variant_id, provider, model, tier;
```

See [`supabase/schema.sql`](../supabase/schema.sql) for the full DDL and [`docs/database.md`](database.md) for operational usage.
