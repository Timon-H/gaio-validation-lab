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

# Optional local persistence mode (no external DB)
# GAIO_LOCAL_PERSIST=true
# GAIO_LOCAL_DB_DIR=.gaio-local-db
```

The `INDEXNOW_KEY` and `SITE_HOST` variables are only needed when you run `npm run indexnow`. They are required for that script and have no effect on local extraction/evaluation runs.

Initialize Supabase schema before any `--persist` run that targets Supabase:

1. Open Supabase SQL Editor.
2. Execute [`supabase/schema.sql`](../supabase/schema.sql).

---

## 3. Build and Run Locally

```bash
npm run build       # TypeScript check + Astro build
npm run dev         # Local server at http://localhost:4321
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
npm run test:extract:persist   # Supabase mode: requires SUPABASE_URL + SUPABASE_ANON_KEY in .env
```

To persist locally without Supabase:

```powershell
$env:GAIO_LOCAL_PERSIST='true'; npm run test:extract:persist
```

---

## 5. Bot User-Agent Simulation

Checks that the middleware correctly identifies AI crawler user-agent strings and sets `X-AI-Bot-Detected` and `X-Test-Group` response headers. Requires the local dev server (step 3) or the live deployment.

```bash
npm run test:bots
```

Expected output: a table showing each simulated bot UA, the detected group, and a pass/fail status for each variant. All checks should pass.

---

## 6. LLM Evaluation

Runs the structured extraction benchmark against all 8 variants using a chosen LLM provider. Each variant is evaluated **n times** for variance measurement.

```bash
# Run against local server (http://localhost:4321, requires npm run dev)
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

For local persistence instead of Supabase:

```powershell
$env:GAIO_LOCAL_PERSIST='true'; npm run evaluate:openai -- --persist
```

Local rows are written to `.gaio-local-db/llm_evaluation_results.jsonl` (and `.gaio-local-db/extraction_results.jsonl` for extraction tests).

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
| `--persist` | off | Persist results in addition to CSV (Supabase or local JSONL mode) |
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
SELECT *
FROM llm_eval_comparison
ORDER BY variant_id, provider, model, tier;
```

You can also inspect structural extraction aggregates:

```sql
SELECT *
FROM extraction_comparison
ORDER BY variant_id, extractor;
```

For full database usage, see [`docs/database.md`](database.md).

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
- **`seed` support varies by provider:** OpenAI uses `seed: 42`; Claude and Gemini do not currently expose a seed parameter in this script path. Temperature is fixed at `0.0` for all providers except OpenAI reasoning models.
