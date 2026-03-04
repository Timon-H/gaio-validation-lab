# gaio-validation-lab
Minimalist environment to validate and benchmark generative AI optimization approaches on web-components

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
/src
  /components/baseline   ← 9 Lit web components (Shadow DOM)
  /layouts
    BaseLayout.astro     ← Neutral page shell (shared styling, SEO constants)
  /lib
    lit-ssr.ts           ← @lit-labs/ssr helper for Declarative Shadow DOM
  /pages
    index.astro          ← Landing page with links to all variants
    /control             ← Baseline — no GAIO measures
    /combined            ← All GAIO measures combined
    /test-jsonld-only    ← Isolated: JSON-LD only
    /test-semantic-only  ← Isolated: Semantic HTML wrappers only
    /test-noscript-only  ← Isolated: <noscript> Light DOM fallbacks only
    /test-aria-only      ← Isolated: ARIA attributes on hosts only
    /test-dsd            ← Isolated: Declarative Shadow DOM via @lit-labs/ssr
  /middleware.ts         ← AI bot detection + Supabase logging
/scripts
  test-bots.mjs              ← Bot UA simulation tests
  test-content-extraction.mjs ← Content extraction + optional Supabase persist
  evaluate-gaio.mjs          ← Multi-provider LLM extraction benchmark (OpenAI / Claude / Gemini)
/supabase
  schema.sql             ← DDL for bot_logs, extraction_results, llm_evaluation_results
```

## Multi-Arm Test Design

Seven variants of the same insurance page content. Each isolates a single GAIO variable for scientific measurement.

| Variant | JSON-LD | Semantic HTML | ARIA | Noscript | DSD | Microdata |
|---------|:-------:|:------------:|:----:|:--------:|:---:|:---------:|
| `/control` | — | — | — | — | — | — |
| `/test-jsonld-only` | ✅ | — | — | — | — | — |
| `/test-semantic-only` | — | ✅ | — | — | — | — |
| `/test-aria-only` | — | — | ✅ | — | — | — |
| `/test-noscript-only` | — | — | — | ✅ | — | — |
| `/test-dsd` | — | — | — | — | ✅ | — |
| `/test-microdata-only` | — | — | — | — | — | ✅ |
| `/combined` | ✅ | ✅ | ✅ | — | ✅ | ✅ |

**Hydration note:** `/combined` and `/test-dsd` are SSR-only in this lab to keep the initial HTML deterministic for crawler/LLM evaluation and to avoid client-side re-rendering artifacts.

### Constants across all variants
- Same 9 Lit web components with Shadow DOM encapsulation
- Same content (insurance FAQ, tariff comparison, form fields, product cards)
- Traditional SEO signals (robots meta, canonical URL) on every page
- Same BaseLayout styling shell
- All 8 variants (including microdata) are covered by the extraction and bot test scripts.

### BaseLayout

`BaseLayout.astro` is a neutral shell providing shared `<head>` boilerplate, styling, and navigation. It applies `robots` and `canonical` as constants on every page (these are not experimental variables). Only `schemaData` is optional — pages that test JSON-LD pass it in.

```astro
<BaseLayout
  title="Page Title"
  description="Page description"
  schemaData={optionalJsonLd}
>
  <!-- page content with its own GAIO measures -->
</BaseLayout>
```

## Methodology (Thesis)

**Objective**
Measure how different GAIO measures affect crawler/LLM extraction from the **initial HTML response** of Shadow DOM components.

**Variables**
- **Independent variables:** JSON-LD, Semantic HTML, ARIA on hosts, `<noscript>` fallbacks, Declarative Shadow DOM (DSD), Microdata.
- **Dependent variables:** extraction quality and structure (word count, headings, links, entity mentions, schema capture, etc.).
- **Controls:** identical content, component set, layout, and SEO constants across all variants.

**Scope and constraints**
- SSR-only is used for `/combined` and `/test-dsd` to keep HTML deterministic and avoid client re-render artifacts.
- Client-side interactivity is **not** part of the measurement scope.

**Measurement approach**
- Use the extraction script to capture text content, structural markers, and schema presence per variant.
- Compare variant outputs against baseline to quantify the impact of each GAIO measure.

**Threats to validity**
- Hydration or client-side rendering changes the DOM post-load and can confound results.
- Language mismatch between content and schema can bias extraction.

**Reporting**
- Report results per variant and summarize deltas vs. baseline.
- Note that findings apply to initial HTML visibility rather than interactive behavior.

## Testing

```bash
# Simulate AI bot visits across all 8 variants
npm run test:bots

# Extract content and compare structural markers
npm run test:extract

# Extract + persist results to Supabase
npm run test:extract:persist
```

## LLM Evaluation

`evaluate-gaio.mjs` runs the structured extraction benchmark against all 8 page variants using a chosen LLM provider. Each run fetches the live HTML and asks the model to extract a fixed set of fields — tariffs (name, price, Deckungssumme, Selbstbeteiligung, payment period, highlighted flag), FAQ entries, product cards, form fields, contact details, and provider name — returning structured JSON. Because most of these fields live inside Shadow DOM, results differ significantly across variants, making extraction counts the primary GAIObility metric.

```bash
# Run with the default provider (OpenAI)
npm run evaluate

# Run with a specific provider
npm run evaluate:openai
npm run evaluate:claude
npm run evaluate:gemini

# Persist results to Supabase (requires SUPABASE_URL + SUPABASE_ANON_KEY)
npm run evaluate:openai:persist
npm run evaluate:claude:persist
npm run evaluate:gemini:persist
```

Results are always written to `results/gaio_evaluation_<provider>.csv`. With `--persist`, each run is also inserted into the `llm_evaluation_results` Supabase table, enabling cross-provider and cross-run comparisons via SQL.

### Required environment variables

An LLM provider API key is **always required** — there is no credential-free mode for this script. Running with `--persist` additionally requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

| Provider | Variable |
|---|---|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic Claude | `ANTHROPIC_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |

Add the relevant keys to your `.env` file. The `dotenv-cli` package loads them automatically via the `npm run evaluate:*` scripts.

### Default models

| Provider | Default model | Swap for higher accuracy |
|---|---|---|
| OpenAI | `gpt-4o-mini` | `gpt-4o` |
| Claude | `claude-3-5-haiku-20241022` | `claude-opus-4-5` |
| Gemini | `gemini-2.0-flash` | `gemini-2.5-pro` |

Models can be changed in the `PROVIDER_CONFIG` table at the top of `evaluate-gaio.mjs`.

## Middleware

The middleware detects 6 AI crawlers (GPTBot, Claude-Web, Google-Extended, PerplexityBot, CCBot, Applebot-Extended) and logs visits to Supabase `bot_logs` with variant path, latency, and status code.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are **optional** for this feature — bot detection and the `X-AI-Bot-Detected` / `X-Test-Group` response headers work regardless. Logging is silently skipped when the keys are absent.

## Content Extraction (`test-content-extraction.mjs`)

Runs in two modes:
- **Dry-run** (`npm run test:extract`) — fetches and analyses all 8 variants locally. No Supabase credentials needed; does not call any LLM API.
- **Persist** (`npm run test:extract:persist`) — same as dry-run, but also writes results to the Supabase `extraction_results` table. Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Technologies

- **Astro 5**: SSR mode with `@astrojs/vercel` adapter
- **Lit 3**: Web components with Shadow DOM encapsulation
- **@lit-labs/ssr**: Server-side rendering to Declarative Shadow DOM
- **TypeScript**: Strict mode
- **Supabase**: Bot logging + extraction results
- **Vercel**: Serverless deployment
- **openai**: OpenAI GPT API client
- **@anthropic-ai/sdk**: Anthropic Claude API client
- **@google/generative-ai**: Google Gemini API client
