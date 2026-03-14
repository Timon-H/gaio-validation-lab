# Replication Guide

## Prerequisites

| Requirement      | Version  | Notes                                            |
| ---------------- | -------- | ------------------------------------------------ |
| Node.js          | ≥ 20.10  | Check with `node --version`                      |
| npm              | ≥ 10     | Bundled with Node.js                             |
| Git              | any      | For cloning the repository                       |
| LLM API key      | —        | At least one of: OpenAI, Anthropic, or Google AI |
| Supabase project | optional | Only required for `--persist` runs               |

---

## 1. Clone and Install

```bash
git clone https://github.com/Timon-H/gaio-validation-lab.git
cd gaio-validation-lab
npm install
```

`npm install` also runs `prepare`, which installs the pre-commit hook (`npm run lint:staged`).

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

The `INDEXNOW_KEY` and `SITE_HOST` variables are only needed when you run `npm run indexnow`. They are required for that script and have no effect on local extraction/evaluation runs.

Initialize Supabase schema before any `--persist` run:

1. Open Supabase SQL Editor.
2. Execute [`supabase/schema.sql`](../supabase/schema.sql).

If your Supabase project already has historical `llm_evaluation_results` rows and you want to keep existing data, run the incremental migration afterwards:

3. Execute [`supabase/migrations/2026-03-14_llm-thinking-controls.sql`](../supabase/migrations/2026-03-14_llm-thinking-controls.sql).

---

## 3. Build and Run Locally

```bash
npm run build       # TypeScript check + Astro build
npm run dev         # Local server at http://localhost:4321
```

The eight variant pages are available at:

| Path              | Variant                            |
| ----------------- | ---------------------------------- |
| `/control`        | Bare Shadow DOM — no GAIO measures |
| `/combined`       | All GAIO measures combined         |
| `/test-jsonld`    | JSON-LD only                       |
| `/test-semantic`  | Semantic HTML only                 |
| `/test-aria`      | ARIA only                          |
| `/test-noscript`  | `<noscript>` fallbacks only        |
| `/test-dsd`       | Declarative Shadow DOM only        |
| `/test-microdata` | Microdata only                     |

---

## 3a. Quality Gate (Recommended Before Experiments)

Run the local quality gate before extraction/evaluation campaigns:

```bash
# Lint + build
npm run lint
npm run build

# Server-backed experiment checks
npm run test:ci
```

`test:ci` starts the local app and executes bot-header validation, extraction smoke checks, and the variant integrity check.

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

Results are written to `results/gaio_evaluation_<provider>_<model>_<timestamp>.csv`. The `results/` directory is gitignored; CSV files are generated locally.

To additionally persist each run to the Supabase `llm_evaluation_results` table:

```bash
npm run evaluate:openai -- --persist
npm run evaluate:openai -- --url https://gaio-validation-lab.vercel.app --persist
```

This requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`.
Persisted rows include `tier` plus `thinking_controls` metadata for reproducibility.

To run a different model tier, pass `--tier`:

```bash
# Run the validation tier (higher-capability models)
npm run evaluate:all -- --tier validation --repetitions 5

# Run the exploratory tier (default: GPT-5-mini)
npm run evaluate:openai -- --tier exploratory --repetitions 5

# Run the exploratory tier with full GPT-5
npm run evaluate:openai -- --tier exploratory --model gpt-5 --repetitions 5

# Sensitivity run with provider-default thinking behavior
npm run evaluate:all -- --tier validation --thinking-profile provider-default --repetitions 5
```

By default, `evaluate.mjs` uses `--thinking-profile minimized` to apply the strongest available per-provider controls for internal reasoning depth.

### Available Flags

| Flag                     | Default                 | Description                                                                                                        |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--provider <id>`        | —                       | Provider to use: `openai`, `claude`, `gemini`, or `all`                                                            |
| `--url <base-url>`       | `http://localhost:4321` | Base URL for all variant fetches                                                                                   |
| `--persist`              | off                     | Write results to Supabase in addition to CSV                                                                       |
| `--repetitions <n>`      | `1`                     | Number of extraction runs per variant                                                                              |
| `--variant <id>`         | all                     | Run a single variant only (e.g. `--variant control`)                                                               |
| `--tier <tier>`          | `primary`               | Model tier: `primary`, `validation`, or `exploratory`. See [`docs/evaluation.md`](evaluation.md) for tier details. |
| `--model <id>`           | tier default            | Optional model override where supported. For OpenAI exploratory: `gpt-5-mini` (default) or `gpt-5`.                |
| `--thinking-profile <p>` | `minimized`             | Thinking-depth control strategy: `minimized` (recommended) or `provider-default` (sensitivity check).              |

---

## 7. Validating Results

### Against Local CSVs

Each run produces a CSV in `results/`. Open any CSV in a spreadsheet tool or parse it with a script. See [`docs/results-interpretation.md`](results-interpretation.md) for a full column reference and worked example.

### Via Supabase

If results were persisted, query the `llm_eval_comparison` view:

```sql
SELECT *
FROM llm_eval_comparison
ORDER BY variant_id, provider, model, tier, thinking_profile;
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
- **Control surfaces differ by provider:** OpenAI Chat Completions (`gpt-4.1*`) and Gemini runs use `seed: 42`; Claude has no seed parameter in this script path; OpenAI reasoning models (`gpt-5*`) do not support seed/temperature.
- **Thinking controls are asymmetric:** Gemini `2.5-flash` can disable thinking (`thinkingBudget=0`), while Gemini `2.5-pro` cannot fully disable thinking (minimum budget is `128`). Claude extended thinking is opt-in and is left disabled unless explicitly enabled.
