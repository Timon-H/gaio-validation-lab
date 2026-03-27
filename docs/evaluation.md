# LLM Evaluation

`scripts/evaluate.mjs` runs the structured extraction benchmark against the canonical 8-page matrix by default, and can optionally run an exploratory visibility-axis pair (`combined-dsd`, `combined-noscript`) via `--variant-set combined-visibility`. Each run fetches the live HTML and asks the model to extract a fixed set of fields:

- **tarife** — name, price, Deckungssumme, Selbstbeteiligung, payment period, highlighted flag
- **faq** — question + answer pairs
- **produktkarten** — product card entries
- **formFelder** — all recognisable form fields, including ARIA-labelled ones
- **kontakt** — contact details
- **anbieter** — provider name

Results are returned as structured JSON. Because most of these fields live inside Shadow DOM, extraction counts vary across variants — this variance is the primary measurement target.

Across providers, this setup is **variance-controlled** rather than strictly deterministic: each provider exposes different control surfaces for seed, temperature, and internal thinking depth.

## Commands

```bash
# Run with a specific provider (primary tier, default)
npm run evaluate:openai
npm run evaluate:claude
npm run evaluate:gemini

# Run all providers with the validation tier
npm run evaluate:all -- --tier validation --repetitions 5

# Run OpenAI exploratory tier (default: GPT-5-mini reasoning probe)
npm run evaluate:openai -- --tier exploratory --repetitions 5

# Run OpenAI exploratory tier with full GPT-5
npm run evaluate:openai -- --tier exploratory --model gpt-5 --repetitions 5

# Sensitivity run with provider-default thinking behavior
npm run evaluate:all -- --tier validation --thinking-profile provider-default --repetitions 5

# Exploratory visibility-axis pair (combined-dsd vs combined-noscript)
npm run evaluate:all -- --variant-set combined-visibility --tier validation --repetitions 5

# Persist canonical results to Supabase (requires SUPABASE_URL + SUPABASE_ANON_KEY)
npm run evaluate:openai -- --persist
npm run evaluate:claude -- --persist
npm run evaluate:gemini -- --persist

# Persist exploratory visibility-axis results to a separate table
npm run evaluate:all -- --variant-set combined-visibility --persist-exploratory --tier validation --repetitions 5
```

Results are always written to `results/gaio_evaluation_<provider>_<model>_<timestamp>.csv`.
CSV columns are metadata-first to separate setup from outcomes:
`Provider, Model, Tier, Thinking_Controls, Variant_ID, Run, ...metrics..., DB, Raw_JSON_Output`.
For exploratory OpenAI runs, use `--model gpt-5-mini` (default) or `--model gpt-5` to run each model independently.
With `--persist`, each canonical run is inserted into `llm_evaluation_results` (including `tier`, `thinking_controls`, `variant_id`, and `base_url`), enabling cross-provider and cross-run comparisons via `llm_eval_comparison`.

With `--persist-exploratory`, exploratory visibility-axis runs (`combined-dsd`, `combined-noscript`) are inserted into `llm_evaluation_results_exploratory`, with analytics exposed via `llm_eval_comparison_exploratory`.

By default (without either persist flag), exploratory visibility-axis runs remain CSV-only.

## Variant Selection

- Default: canonical set (`control`, `jsonld`, `semantic`, `aria`, `noscript`, `dsd`, `microdata`, `combined`)
- Optional set: `--variant-set combined-visibility` (only `combined-dsd`, `combined-noscript`)
- Single route: `--variant <id>` supports canonical and exploratory IDs

Variant IDs come from [src/data/variants.mjs](../src/data/variants.mjs):
`VARIANTS` (canonical), `EXPLORATORY_VARIANTS` (exploratory), and `ALL_VARIANTS` (combined).

## Environment Variables

Running the evaluation requires an LLM provider API key. Running with `--persist` or `--persist-exploratory` additionally requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

| Variable            | Required for                           |
| ------------------- | -------------------------------------- |
| `OPENAI_API_KEY`    | OpenAI provider                        |
| `ANTHROPIC_API_KEY` | Claude provider                        |
| `GEMINI_API_KEY`    | Gemini provider                        |
| `SUPABASE_URL`      | `--persist` or `--persist-exploratory` |
| `SUPABASE_ANON_KEY` | `--persist` or `--persist-exploratory` |

Add the relevant keys to your `.env` file. The npm scripts load them automatically via Node's native `--env-file` flag.

## Model Tiers

The evaluation uses a tiered model strategy. Use `--tier <tier>` to select (default: `primary`).

Use `--model <model-id>` only where multiple models are available for that provider+tier. Currently this applies to OpenAI exploratory:

- `gpt-5-mini` (default)
- `gpt-5`

### Primary Tier — `--tier primary`

Cost-effective models with strongest available variance controls (`temperature: 0.0`, `seed` where supported, provider-specific thinking controls). Used for the main analysis with 10+ repetitions.

| Provider | Model              | Input/MTok | Output/MTok |
| -------- | ------------------ | ---------- | ----------- |
| OpenAI   | `gpt-4.1-mini`     | $0.40      | $1.60       |
| Claude   | `claude-haiku-4-5` | $1.00      | $5.00       |
| Gemini   | `gemini-2.5-flash` | $0.30      | $2.50       |

### Validation Tier — `--tier validation`

Higher-capability models from each provider, same API surface and variance controls. Used with fewer repetitions (e.g., 5) to confirm that GAIO measure effects generalise across model capability levels.

| Provider | Model               | Input/MTok | Output/MTok |
| -------- | ------------------- | ---------- | ----------- |
| OpenAI   | `gpt-4.1`           | $2.00      | $8.00       |
| Claude   | `claude-sonnet-4-5` | $3.00      | $15.00      |
| Gemini   | `gemini-2.5-pro`    | $1.25      | $10.00      |

### Exploratory Tier — `--tier exploratory`

OpenAI-only GPT-5 reasoning probe. Default model is `gpt-5-mini`; use `--model gpt-5` for the full model. Uses the Responses API and is intentionally kept separate from cross-provider baseline runs because reasoning controls are not symmetric across providers.

| Provider | Model        | Input/MTok | Output/MTok |
| -------- | ------------ | ---------- | ----------- |
| OpenAI   | `gpt-5-mini` | $0.25      | $2.00       |
| OpenAI   | `gpt-5`      | $1.25      | $10.00      |

Reasoning models (GPT-5 family, o3, o4-mini) do not support `temperature` or `seed` parameters. They use a separate code path (`callOpenAIReasoning`) that calls the OpenAI Responses API instead of Chat Completions. Claude and Gemini are not available in this tier.

## Thinking Profile Controls

Use `--thinking-profile <profile>` to control how aggressively the script minimizes internal reasoning.

- `minimized` (default)
  - OpenAI exploratory (GPT-5): `reasoning.effort = minimal`
  - Gemini `2.5-flash`: `thinkingBudget = 0` (thinking disabled)
  - Gemini `2.5-pro`: `thinkingBudget = 128` (minimum allowed; cannot disable)
  - Claude: extended thinking remains off because no `thinking` object is sent (extended thinking is opt-in)
- `provider-default`
  - Leaves provider thinking depth at default behavior
  - OpenAI exploratory uses `reasoning.effort = low`
  - Gemini runs without explicit thinking budgets

Gemini runs always set `seed = 42` for additional run-to-run stability.

### Recommended Runs for Thesis

| Tier                 | Command                                                                                                                         | Repetitions | Purpose               | Est. Cost |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------- | --------- |
| Primary              | `npm run evaluate:all -- --persist --repetitions 10`                                                                            | 10          | Main analysis         | ~$5       |
| Validation           | `npm run evaluate:all -- --persist --tier validation --repetitions 5`                                                           | 5           | Cross-tier robustness | ~$7       |
| Exploratory (OpenAI) | `npm run evaluate:openai -- --persist --tier exploratory --model gpt-5-mini --repetitions 5` or `--model gpt-5 --repetitions 5` | 5           | Reasoning model probe | ~$2       |
| Sensitivity          | `npm run evaluate:all -- --persist --tier validation --thinking-profile provider-default --repetitions 5`                       | 5           | Control-surface check | ~$7       |

Optional exploratory visibility-axis check (CSV-only by default):

```bash
npm run evaluate:all -- --variant-set combined-visibility --tier validation --repetitions 5

# with separate exploratory DB persistence
npm run evaluate:all -- --variant-set combined-visibility --persist-exploratory --tier validation --repetitions 5
```

Exploratory estimates assume similar token volumes across both model runs; `gpt-5` is priced at 5x `gpt-5-mini` for input and output.

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

Generation controls are provider-specific:

- OpenAI Chat Completions (`gpt-4.1*`): `temperature: 0.0`, `seed: 42`
- OpenAI Responses reasoning (`gpt-5*` exploratory): no temperature/seed; effort set via `reasoning.effort`
- Claude: `temperature: 0.0`; no seed exposed in this script path; extended thinking remains off unless explicitly enabled
- Gemini: `temperature: 0.0`, `seed: 42`, plus optional `thinkingBudget` depending on thinking profile/model

## Rate Limiting

The script includes `callLLMWithRetry()` which handles 429 responses by parsing the `retryDelay` field from the error JSON and waiting that duration plus a 2-second buffer before retrying.

## Supabase Schema

Canonical persisted rows are stored in `llm_evaluation_results`, while exploratory visibility-axis persisted rows are stored in `llm_evaluation_results_exploratory`. Both include `thinking_controls` metadata per run.

Canonical aggregation view:

```sql
SELECT *
FROM llm_eval_comparison
ORDER BY variant_id, provider, model, tier, thinking_profile;
```

Exploratory aggregation view:

```sql
SELECT *
FROM llm_eval_comparison_exploratory
ORDER BY variant_id, provider, model, tier, thinking_profile;
```

Canonical macro F1 view:

```sql
SELECT *
FROM v_macro_f1_scores
ORDER BY variant_id, provider, model;
```

Exploratory macro F1 view:

```sql
SELECT *
FROM v_macro_f1_scores_exploratory
ORDER BY variant_id, provider, model;
```

See [`supabase/schema.sql`](../supabase/schema.sql) for the full DDL and [`docs/database.md`](database.md) for operational usage.
