# Copilot Instructions

## Project Overview

This is a master's thesis research project benchmarking how HTML markup techniques affect AI/LLM content extraction from Web Components with Shadow DOM encapsulation. It tests six **GAIO (Generative AI Optimization)** measures across 8 isolated page variants deployed on Vercel.

## Stack

- **Astro 5** (`output: 'server'`, Vercel SSR adapter) — file-based routing, no content collections
- **Lit 3** + **@lit-labs/ssr 4** — web components with Shadow DOM; SSR for Declarative Shadow DOM (DSD) variant
- **Supabase** — logging bot visits and storing LLM evaluation results
- **TypeScript** (`astro/tsconfigs/strict`, `experimentalDecorators: true`, `useDefineForClassFields: false`)

## Commands

```bash
# Development
npm run dev                        # Start local dev server at http://localhost:4321
npm run build                      # astro check + astro build (type-check first)

# Evaluation scripts (require .env with API keys)
npm run evaluate:openai            # Run OpenAI extraction benchmark, output CSV to results/
npm run evaluate:claude            # Run Claude extraction benchmark
npm run evaluate:gemini            # Run Gemini extraction benchmark
npm run evaluate:all               # Run all three providers in sequence
# Flags (pass after --): --persist, --url <url>, --repetitions <n>, --variant <id>
# Example: npm run evaluate:all -- --persist --repetitions 3

# Testing
npm run test:extract               # Simulate bot content extraction (curl/UA variants)
npm run test:extract:persist       # Same + persist to Supabase
npm run test:bots                  # Validate middleware bot detection headers
npm run test:all                   # Run both test:bots and test:extract
```

There is no unit test framework — `test:*` scripts are integration/simulation scripts in `scripts/`.

## Architecture

### Page Variants

Each of the 8 routes under `src/pages/` is an isolated single-variable experiment:

| Route             | GAIO Measure                          |
| ----------------- | ------------------------------------- |
| `/control`        | None (baseline)                       |
| `/test-jsonld`    | JSON-LD structured data in `<head>`   |
| `/test-semantic`  | Semantic HTML landmarks               |
| `/test-aria`      | ARIA attributes                       |
| `/test-noscript`  | `<noscript>` Light DOM fallbacks      |
| `/test-dsd`       | Declarative Shadow DOM (SSR-rendered) |
| `/test-microdata` | Microdata `itemscope`/`itemprop`      |
| `/combined`       | All measures combined                 |

All pages share the same hardcoded insurance product content (Haftpflicht, Hausrat, Kasko tariffs). Content is never fetched or generated dynamically — the _markup_ differs, not the content.

### Lit Web Components (`src/components/baseline/`)

- All components are prefixed `dxp-` and extend `LitElement`
- Use `@customElement`, `@property`, `@state` Lit decorators
- Shadow DOM is on by default (encapsulation is what's being tested)
- Components use `--dxp-*` CSS custom properties for theming
- `index.ts` re-exports all components for a single import point

### Declarative Shadow DOM (DSD) via SSR

`src/lib/lit-ssr.ts` wraps `@lit-labs/ssr` to server-render Lit components into `<template shadowrootmode="open">` elements, making Shadow DOM content visible in the initial HTML without JavaScript. Only `/test-dsd` and `/combined` use this.

### Middleware (`src/middleware.ts`)

Runs on every request:

1. Detects AI bot User-Agent strings (GPTBot, ClaudeBot, Google-Extended, etc.)
2. Logs the visit to Supabase `bot_logs` with `bot_name`, `test_group`, `latency_ms`
3. Sets response headers: `X-AI-Bot-Detected`, `X-Test-Group`, `X-Response-Time`

### Test Traps (`src/components/traps/`)

Seven deliberately structured HTML elements embedded across pages to disambiguate GAIO measures (e.g., `aria-hidden` bonus card to test ARIA suppression, deprecated tariff in `<s>` to test semantic signal). See `docs/traps.md` for the full signal matrix.

### Supabase Schema (`supabase/schema.sql`)

Three tables:

- `bot_logs` — real AI crawler visits (populated by middleware)
- `extraction_results` — simulated extraction runs (populated by `test:extract` scripts)
- `llm_evaluation_results` — LLM benchmark results (populated by `evaluate:*` scripts with `--persist`)

RLS is enabled but intentionally permissive (anon insert/read) for the lab environment.

## Key Conventions

- **`--persist` flag**: Any evaluation/extraction script writes to Supabase only when `--persist` is passed. Without it, results go to stdout/CSV only.
- **`--url` flag**: Evaluation scripts default to `http://localhost:4321`; pass `--url` to target production.
- **Variant IDs** used across scripts and DB: `control`, `combined`, `jsonld`, `semantic`, `aria`, `noscript`, `dsd`, `microdata`
- **`useDefineForClassFields: false`** in tsconfig is required for Lit decorators — do not change this.
- **`output: 'server'`** in `astro.config.mjs` is intentional (not a static site) — needed so middleware runs on every request for bot logging.
- Results CSVs in `results/` are gitignored and generated by the evaluate scripts.
