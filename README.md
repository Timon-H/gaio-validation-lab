# gaio-validation-lab

Minimalist environment to validate and benchmark generative AI optimization (GAIO) approaches on web components with Shadow DOM encapsulation.

## Live Deployment

Eight variants of the same insurance page content, each isolating a single GAIO variable:

| Variant | GAIO Measure | URL |
|---|---|---|
| Control | None — bare Shadow DOM baseline | [/control](https://gaio-validation-lab.vercel.app/control) |
| Combined | All measures combined | [/combined](https://gaio-validation-lab.vercel.app/combined) |
| JSON-LD only | Structured data in `<head>` | [/test-jsonld-only](https://gaio-validation-lab.vercel.app/test-jsonld-only) |
| Semantic HTML only | `<section>`, `<article>`, `<aside>` wrappers | [/test-semantic-only](https://gaio-validation-lab.vercel.app/test-semantic-only) |
| ARIA only | `aria-label` / `aria-labelledby` on host elements | [/test-aria-only](https://gaio-validation-lab.vercel.app/test-aria-only) |
| `<noscript>` only | Light DOM fallbacks for no-JS crawlers | [/test-noscript-only](https://gaio-validation-lab.vercel.app/test-noscript-only) |
| Declarative Shadow DOM | SSR-rendered shadow content via `@lit-labs/ssr` | [/test-dsd](https://gaio-validation-lab.vercel.app/test-dsd) |
| Microdata only | Inline `schema.org` `itemscope`/`itemprop` attributes | [/test-microdata-only](https://gaio-validation-lab.vercel.app/test-microdata-only) |

## Quick Start

```bash
npm install
npm run dev    # development server
npm run build  # production build
```

## Project Structure

```
src/
  components/baseline/   ← 9 Lit web components (Shadow DOM)
  layouts/BaseLayout.astro ← Shared page shell
  lib/lit-ssr.ts          ← @lit-labs/ssr helper for Declarative Shadow DOM
  middleware.ts           ← AI bot detection + Supabase logging
  pages/
    control/             ← Baseline — no GAIO measures
    combined/            ← All GAIO measures combined
    test-jsonld-only/    ← Isolated: JSON-LD
    test-semantic-only/  ← Isolated: Semantic HTML
    test-aria-only/      ← Isolated: ARIA attributes
    test-noscript-only/  ← Isolated: <noscript> fallbacks
    test-dsd/            ← Isolated: Declarative Shadow DOM
    test-microdata-only/ ← Isolated: Microdata
scripts/
  evaluate-gaio.mjs           ← Multi-provider LLM extraction benchmark
  test-bots.mjs               ← Bot UA simulation
  test-content-extraction.mjs ← Structural content extraction
supabase/
  schema.sql             ← DDL: bot_logs, extraction_results, llm_evaluation_results
docs/
  test-design.md         ← Variant matrix, BaseLayout, methodology
  traps.md               ← Five test traps and signal matrix
  evaluation.md          ← LLM evaluation script reference
  scripts.md             ← All scripts and middleware reference
```

## Documentation

| Document | Contents |
|---|---|
| [docs/test-design.md](docs/test-design.md) | Multi-arm variant design, constants, BaseLayout, methodology |
| [docs/traps.md](docs/traps.md) | Five embedded test traps (Fallen) with per-variant implementation and signal matrix |
| [docs/evaluation.md](docs/evaluation.md) | LLM evaluation script — commands, models, env vars, Supabase schema |
| [docs/scripts.md](docs/scripts.md) | Bot simulation, content extraction, middleware reference |

## Technologies

- **Astro 5** · **Lit 3** · **@lit-labs/ssr** · **TypeScript**
- **openai** · **@anthropic-ai/sdk** · **@google/generative-ai**
- **Supabase** · **Vercel**
