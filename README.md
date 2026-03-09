# gaio-validation-lab

Minimalist environment to validate and benchmark generative AI optimization (GAIO) approaches on web components with Shadow DOM encapsulation.

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
