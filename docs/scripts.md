# Scripts Reference

This page documents all executable scripts in `scripts/` and how they relate to the benchmark workflow.

## Shared Conventions

- Variant routing comes from `src/data/variants.mjs` (`VARIANTS`, `VARIANT_PATHS`) and is shared by middleware and scripts.
- Supabase writes use `src/lib/supabase.mjs` (`supabaseInsert`).
- Scripts that persist data require `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- NPM shortcuts for `evaluate:*`, `indexnow`, and `test:extract:persist` load `.env` via Node `--env-file`.
- Database setup and query examples are documented in [docs/database.md](database.md).

## LLM Evaluation (`evaluate.mjs`)

Structured multi-provider extraction benchmark with provider and tier selection.

See [docs/evaluation.md](evaluation.md) for full details, including model tiers, deterministic settings, pricing, and recommended thesis runs.

### Quick Commands

```bash
# One provider (primary tier by default)
npm run evaluate:openai
npm run evaluate:claude
npm run evaluate:gemini

# All providers, validation tier, repeated runs
npm run evaluate:all -- --tier validation --repetitions 5

# Optional persistence to Supabase
npm run evaluate:all -- --persist --repetitions 5
```

### Flags

- `--provider <openai|claude|gemini|all>`
- `--tier <primary|validation|exploratory>`
- `--repetitions <n>`
- `--variant <id>`
- `--url <base-url>`
- `--persist`

Output is always written to `results/gaio_evaluation_<provider>_<timestamp>.csv`.

## Bot Simulation (`test-bots.mjs`)

Simulates crawler requests with representative user-agent tokens for all 16 bot groups detected by middleware.

### Commands (Bot Simulation)

```bash
# Default target: http://localhost:4321
npm run test:bots

# Custom target URL
node ./scripts/test-bots.mjs https://gaio-validation-lab.vercel.app
```

### What It Checks

- `X-AI-Bot-Detected` header matches expected bot group.
- `X-Test-Group` header matches the expected route slug for each variant.
- `X-Variant-Id` header matches the canonical variant ID for each route.
- HTTP status remains healthy under HEAD requests.

No credentials are required.

## Content Extraction Smoke Test (`test-extract.mjs`)

Fetches all variants for a small extractor set (`GPTBot`, `ClaudeBot`, `GoogleBot`, `curl`) and reports structural markers.

### Commands (Content Extraction)

```bash
# Dry run (stdout table only)
npm run test:extract

# Dry run against production
node ./scripts/test-extract.mjs https://gaio-validation-lab.vercel.app

# Persist to Supabase (uses .env via npm script)
npm run test:extract:persist

# Persist against production
node --env-file=.env ./scripts/test-extract.mjs --persist https://gaio-validation-lab.vercel.app
```

### Inputs

- Optional base URL positional argument (defaults to `http://localhost:4321`).
- Optional `--persist` flag.

### Outputs

- Fixed-width console report per variant and bot.
- Marker assertions for LD, NOSCRIPT, DSD, and MICRODATA expectations.
- Optional DB writes to `extraction_results` when `--persist` is set.

`--persist` requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## IndexNow Submission (`indexnow.mjs`)

Submits all variant URLs to IndexNow (`https://api.indexnow.org/IndexNow`) after deployment.

### Command

```bash
npm run indexnow
```

### Required Environment

| Variable | Purpose |
| --- | --- |
| `SITE_HOST` | Public host, e.g. `gaio-validation-lab.vercel.app` |
| `INDEXNOW_KEY` | IndexNow key matching deployed key file name |

The script builds `urlList` from `VARIANT_PATHS`, so every benchmark route is submitted consistently.

### Expected Responses

- `200`: submitted immediately
- `202`: accepted/queued (normal)
- `422`: key file missing or unreachable at `https://<host>/<key>.txt`

## Middleware (`src/middleware.ts`)

Detects 16 AI crawler groups by user-agent and logs visits to Supabase `bot_logs` with `variant_id`, path, latency, and status.

| Group | User-agent tokens |
| --- | --- |
| ChatGPT | `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `ChatGPT Agent` |
| Claude | `ClaudeBot`, `Claude-Web`, `Claude-User`, `Claude-SearchBot`, `anthropic-ai` |
| Gemini | `Google-Extended`, `Gemini-Deep-Research`, `Google-NotebookLM`, `NotebookLM`, `GoogleAgent-Mariner` |
| Perplexity | `PerplexityBot`, `Perplexity-User` |
| CommonCrawl | `CCBot` |
| Applebot | `Applebot`, `Applebot-Extended` |
| Meta | `meta-externalagent`, `Meta-ExternalAgent`, `meta-externalfetcher`, `meta-webindexer` |
| DeepSeek | `DeepSeekBot` |
| Mistral | `MistralAI-User` |
| DuckDuckGo | `DuckAssistBot` |
| Brave | `Bravebot` |
| You | `YouBot` |
| Cohere | `cohere-ai`, `cohere-training-data-crawler` |
| ByteDance | `Bytespider`, `TikTokSpider` |
| Manus | `Manus-User` |
| Amazon | `Amazonbot`, `amazon-kendra`, `AmazonBuyForMe` |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are optional. Detection headers still work when keys are absent; only persistence is skipped.

## Database Views

Schema v2 provides three analytics views:

- `gaio_comparison` -> bot visit aggregates per variant
- `extraction_comparison` -> structural extraction aggregates per variant and extractor
- `llm_eval_comparison` -> LLM extraction aggregates per variant/provider/model/tier

See [docs/database.md](database.md) for SQL examples.
