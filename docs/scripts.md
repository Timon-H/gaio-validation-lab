# Scripts Reference

## Bot Simulation (`test-bots.mjs`)

Simulates AI crawler visits across all 8 variants using known bot user-agent strings (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Applebot-Extended, meta-externalagent, PerplexityBot, CCBot).

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

## IndexNow Submission (`indexnow.mjs`)

Submits all 8 variant URLs to the IndexNow API (Bing). Run this after deploying content changes to trigger re-crawling.

```bash
npm run indexnow
```

Requires the key file `public/292555bae5aa48bcb6f7a67f3c4c0a62.txt` to be deployed and reachable at the site root. Expects a `202 Accepted` response.

---

## Middleware (`src/middleware.ts`)

Detects 7 AI crawler groups by user-agent and logs visits to Supabase `bot_logs` with variant path, latency, and status code.

| Group | User-agent tokens |
|---|---|
| ChatGPT | `GPTBot`, `ChatGPT-User`, `OAI-SearchBot` |
| Claude | `ClaudeBot`, `Claude-Web`, `anthropic-ai` |
| Gemini | `Google-Extended` |
| Applebot | `Applebot-Extended` |
| Meta | `meta-externalagent` |
| Perplexity | `PerplexityBot` |
| CommonCrawl | `CCBot` |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are **optional** — bot detection and the `X-AI-Bot-Detected` / `X-Test-Group` response headers work regardless. Logging is silently skipped when the keys are absent.
