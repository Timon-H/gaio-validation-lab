# Replication Guide

This guide provides step-by-step instructions for replicating the GAIO Validation Lab experiments.

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.10 | Check with `node --version` |
| npm | ≥ 10 | Bundled with Node.js |
| Git | any | For cloning the repository |
| LLM API key | — | At least one of: OpenAI, Anthropic, or Google AI |
| Supabase project | optional | Only required for `--persist` runs |

---

## 1. Clone and Install

```bash
git clone https://github.com/Timon-H/gaio-validation-lab.git
cd gaio-validation-lab
npm install
```

---

## 2. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Open `.env` and set the variables you need:

```dotenv
# Required for LLM evaluation (at least one provider key)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Required only for --persist runs
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

The `INDEXNOW_KEY` and `SITE_HOST` variables in `.env.example` are optional overrides for `scripts/indexnow.mjs`. They default to the deployed Vercel project values and do not need to be set for local evaluation.

---

## 3. Build and Preview (Local)

```bash
npm run build       # TypeScript check + Astro build
npm run preview     # Serve the production build locally at http://localhost:4321
```

The eight variant pages are available at:

| Path | Variant |
|---|---|
| `/control` | Bare Shadow DOM — no GAIO measures |
| `/combined` | All GAIO measures combined |
| `/test-jsonld-only` | JSON-LD only |
| `/test-semantic-only` | Semantic HTML only |
| `/test-aria-only` | ARIA only |
| `/test-noscript-only` | `<noscript>` fallbacks only |
| `/test-dsd` | Declarative Shadow DOM only |
| `/test-microdata-only` | Microdata only |

---

## 4. Structural Extraction Test (no credentials required)

Verifies that structural markers (headings, word count, schema presence) are correctly detected across all variants. No LLM API call is made.

```bash
npm run test:extract
```

Expected output: a table showing per-variant word counts, heading counts, link counts, and schema detection flags. All 8 variants should return results. No credentials are required for this step.

To persist the results to Supabase:

```bash
npm run test:extract:persist   # requires SUPABASE_URL + SUPABASE_ANON_KEY in .env
```

---

## 5. Bot User-Agent Simulation

Verifies that the middleware correctly identifies AI crawler user-agent strings and sets `X-AI-Bot-Detected` and `X-Test-Group` response headers. Requires the local preview server (step 3) or the live deployment.

```bash
npm run test:bots
```

Expected output: a table showing each simulated bot UA, the detected group, and a pass/fail status for each variant. All checks should pass.

---

## 6. LLM Evaluation

Runs the structured extraction benchmark against all 8 variants using a chosen LLM provider. Each variant is evaluated **n times** for variance measurement.

```bash
# Run against the local build (http://localhost:4321, requires preview server running)
npm run evaluate:openai
npm run evaluate:claude
npm run evaluate:gemini

# Run against the live Vercel deployment
npm run evaluate:openai:live
npm run evaluate:claude:live
npm run evaluate:gemini:live
```

Results are written to `results/gaio_evaluation_<provider>_<timestamp>.csv`. The `results/` directory is gitignored; CSV files are generated locally.

To additionally persist each run to the Supabase `llm_evaluation_results` table:

```bash
npm run evaluate:openai:persist         # local build + persist
npm run evaluate:openai:live:persist    # live deployment + persist
```

This requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`.

---

## 7. Validating Results

### Against Local CSVs

Each run produces a CSV in `results/`. Open any CSV in a spreadsheet tool or parse it with a script. See [`docs/results-interpretation.md`](results-interpretation.md) for a full column reference and worked example.

### Via Supabase

If results were persisted, query the `llm_eval_comparison` view:

```sql
SELECT variant_id, provider, model,
  AVG(tarife_count), AVG(faq_count),
  AVG(form_felder_count)
FROM llm_eval_comparison
GROUP BY variant_id, provider, model
ORDER BY variant_id;
```

Or use the Supabase dashboard: **Table Editor → llm_eval_comparison**.

---

## 8. Repeating Experiments

To run additional evaluation rounds for higher statistical confidence:

```bash
# Run additional rounds (each npm run call executes n repetitions internally)
npm run evaluate:openai:live
npm run evaluate:openai:live
npm run evaluate:openai:live
```

Each call generates a new timestamped CSV. Aggregate across files for broader statistics.

---

## Known Limitations

- **API quotas:** Gemini free-tier quota may throttle or reject requests during high-load periods. The script includes automatic retry logic with exponential backoff.
- **Live vs. local differences:** The `:live` variants evaluate the deployed Vercel URL; the default variants evaluate `localhost:4321`. Results should be identical given the same HTML output, but network latency and caching may introduce minor differences.
- **`/combined` and `/test-dsd` are SSR-only:** These two variants disable client-side hydration to keep the initial HTML deterministic. Other variants use standard Astro SSR with client-side Lit hydration.
- **`seed` support varies by provider:** OpenAI and Gemini support `seed: 42`; Claude does not currently expose a seed parameter. Temperature is fixed at `0.0` for all providers.
