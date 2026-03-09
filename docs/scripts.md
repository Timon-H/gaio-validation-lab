# Scripts Reference

## Bot Simulation (`test-bots.mjs`)

Simulates AI crawler visits across all 8 variants using known bot user-agent strings (GPTBot, Claude-Web, Google-Extended, PerplexityBot, CCBot, Applebot-Extended).

```bash
npm run test:bots
```

Verifies that the middleware correctly sets `X-AI-Bot-Detected` and `X-Test-Group` response headers, and optionally logs to Supabase `bot_logs`.

## Content Extraction (`test-content-extraction.mjs`)

Fetches all 8 variants and compares structural markers — word count, headings, links, entity mentions, schema presence.

```bash
# Dry-run — no credentials needed, no LLM API called
npm run test:extract

# Persist results to Supabase extraction_results table
npm run test:extract:persist
```

`--persist` requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## LLM Evaluation (`evaluate-gaio.mjs`)

Structured multi-provider extraction benchmark. See [docs/evaluation.md](evaluation.md) for full reference.

---

## Middleware (`src/middleware.ts`)

Detects 6 AI crawlers by user-agent and logs visits to Supabase `bot_logs` with variant path, latency, and status code.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are **optional** — bot detection and the `X-AI-Bot-Detected` / `X-Test-Group` response headers work regardless. Logging is silently skipped when the keys are absent.
