# Scripts Reference

## Bot Simulation (`test-bots.mjs`)

Simulates AI crawler visits across all 8 variants using representative user-agent strings for all 16 detected bot groups: ChatGPT, Claude, Gemini, Perplexity, CommonCrawl, Applebot, Meta, DeepSeek, Mistral, DuckDuckGo, Brave, You, Cohere, ByteDance, Manus, and Amazon.

```bash
npm run test:bots
```

Verifies that the middleware correctly sets `X-AI-Bot-Detected` and `X-Test-Group` response headers, and optionally logs to Supabase `bot_logs`.

## Content Extraction (`test-extract.mjs`)

Fetches all 8 variants and compares structural markers — word count, headings, links, entity mentions, schema presence.

```bash
# Dry-run — no credentials needed, no LLM API called
npm run test:extract

# Persist results to Supabase extraction_results table
npm run test:extract:persist
```

    `--persist` requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## LLM Evaluation (`evaluate.mjs`)

Structured multi-provider extraction benchmark. Supports three model tiers (`--tier primary|validation|exploratory`) for cross-capability analysis. See [docs/evaluation.md](evaluation.md) for full reference including tier details, pricing, and recommended runs.

## IndexNow Submission (`indexnow.mjs`)

Submits all 8 variant URLs to the IndexNow API (Bing). Run this after deploying content changes to trigger re-crawling.

```bash
npm run indexnow
```

Requires the key file `public/292555bae5aa48bcb6f7a67f3c4c0a62.txt` to be deployed and reachable at the site root. Expects a `202 Accepted` response.

---

## Middleware (`src/middleware.ts`)

Detects 16 AI crawler groups by user-agent and logs visits to Supabase `bot_logs` with variant path, latency, and status code.

| Group | User-agent tokens |
|---|---|
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

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are **optional** — bot detection and the `X-AI-Bot-Detected` / `X-Test-Group` response headers work regardless. Logging is silently skipped when the keys are absent.
