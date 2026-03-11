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
# Run with a specific provider
npm run evaluate:openai
npm run evaluate:claude
npm run evaluate:gemini

# Persist results to Supabase (requires SUPABASE_URL + SUPABASE_ANON_KEY)
npm run evaluate:openai -- --persist
npm run evaluate:claude -- --persist
npm run evaluate:gemini -- --persist
```

Results are always written to `results/gaio_evaluation_<provider>.csv`. With `--persist`, each run is also inserted into the `llm_evaluation_results` Supabase table, enabling cross-provider and cross-run comparisons via the `llm_eval_comparison` SQL view.

## Environment Variables

Running the evaluation requires an LLM provider API key. Running with `--persist` additionally requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

| Variable | Required for |
|---|---|
| `OPENAI_API_KEY` | OpenAI provider |
| `ANTHROPIC_API_KEY` | Claude provider |
| `GEMINI_API_KEY` | Gemini provider |
| `SUPABASE_URL` | `--persist` flag |
| `SUPABASE_ANON_KEY` | `--persist` flag |

Add the relevant keys to your `.env` file. The npm scripts load them automatically via Node's native `--env-file` flag.

## Default Models

| Provider | Default model | Higher accuracy alternative |
|---|---|---|
| OpenAI | `gpt-4.1-mini` | `gpt-4.1` |
| Claude | `claude-haiku-4-5` | `claude-opus-4-5` |
| Gemini | `gemini-3-flash-preview` | `gemini-3-pro-preview` |

Models can be changed in the `PROVIDER_CONFIG` table at the top of `evaluate.mjs`.

## JSON Enforcement Per Provider

Each provider uses a different mechanism to guarantee JSON output:

| Provider | Mechanism |
|---|---|
| OpenAI | `response_format: { type: 'json_object' }` |
| Claude | Assistant prefilling — message array starts with `{ role: 'assistant', content: '{' }` |
| Gemini | `responseMimeType: 'application/json'` in generation config |

All providers use `temperature: 0.0` and, where supported, `seed: 42` for reproducibility.

## Rate Limiting

The script includes `callLLMWithRetry()` which handles 429 responses by parsing the `retryDelay` field from the error JSON and waiting that duration plus a 2-second buffer before retrying.

## Supabase Schema

The `llm_evaluation_results` table stores one row per variant × provider run. The `llm_eval_comparison` view aggregates averages across runs:

```sql
SELECT variant_id, provider, model,
  AVG(tarife_count), AVG(faq_count),
  AVG(produktkarten_count), AVG(form_felder_count),
  SUM(hat_kontakt::int), SUM(hat_anbieter::int)
FROM llm_evaluation_results
GROUP BY variant_id, provider, model;
```

See [`supabase/schema.sql`](../supabase/schema.sql) for the full DDL.
