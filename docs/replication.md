# Replication Guide

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
| `/test-jsonld` | JSON-LD only |
| `/test-semantic` | Semantic HTML only |
| `/test-aria` | ARIA only |
| `/test-noscript` | `<noscript>` fallbacks only |
| `/test-dsd` | Declarative Shadow DOM only |
| `/test-microdata` | Microdata only |

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

Checks that the middleware correctly identifies AI crawler user-agent strings and sets `X-AI-Bot-Detected` and `X-Test-Group` response headers. Requires the local preview server (step 3) or the live deployment.

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
npm run evaluate:openai -- --url https://gaio-validation-lab.vercel.app
npm run evaluate:claude -- --url https://gaio-validation-lab.vercel.app
npm run evaluate:gemini -- --url https://gaio-validation-lab.vercel.app
```

Results are written to `results/gaio_evaluation_<provider>_<timestamp>.csv`. The `results/` directory is gitignored; CSV files are generated locally.

To additionally persist each run to the Supabase `llm_evaluation_results` table:

```bash
npm run evaluate:openai -- --persist
npm run evaluate:openai -- --url https://gaio-validation-lab.vercel.app --persist
```

This requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`.

To run a different model tier, pass `--tier`:

```bash
# Run the validation tier (higher-capability models)
npm run evaluate:all -- --tier validation --repetitions 5

# Run the exploratory tier (GPT-5-nano reasoning model)
npm run evaluate:openai -- --tier exploratory --repetitions 5
```

### Available Flags

| Flag | Default | Description |
|---|---|---|
| `--provider <id>` | — | Provider to use: `openai`, `claude`, `gemini`, or `all` |
| `--url <base-url>` | `http://localhost:4321` | Base URL for all variant fetches |
| `--persist` | off | Write results to Supabase in addition to CSV |
| `--repetitions <n>` | `1` | Number of extraction runs per variant |
| `--variant <id>` | all | Run a single variant only (e.g. `--variant control`) |
| `--tier <tier>` | `primary` | Model tier: `primary`, `validation`, or `exploratory`. See [`docs/evaluation.md`](evaluation.md) for tier details. |

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
npm run evaluate:openai -- --url https://gaio-validation-lab.vercel.app
npm run evaluate:openai -- --url https://gaio-validation-lab.vercel.app
npm run evaluate:openai -- --url https://gaio-validation-lab.vercel.app
```

Each call generates a new timestamped CSV; aggregate multiple runs for more reliable statistics.

---

## Known Limitations

- **API quotas:** Gemini free-tier quota may throttle or reject requests during high-load periods. The script includes automatic retry logic with exponential backoff.
- **Live vs. local differences:** Passing `--url https://gaio-validation-lab.vercel.app` evaluates the deployed Vercel URL; the default targets `localhost:4321`. Results should be identical given the same HTML output, but network latency and caching may introduce minor differences.
- **`/combined` and `/test-dsd` are SSR-only:** These two variants disable client-side hydration to keep the initial HTML deterministic. Other variants use standard Astro SSR with client-side Lit hydration.
- **`seed` support varies by provider:** OpenAI and Gemini support `seed: 42`; Claude does not currently expose a seed parameter. Temperature is fixed at `0.0` for all providers.
