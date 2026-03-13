# gaio-validation-lab

This repository benchmarks how different HTML markup techniques affect content extraction from Web Components with **Shadow DOM encapsulation** by AI crawlers and large language models.

Shadow DOM — used extensively in component-driven DXP architectures — is opaque to most AI crawlers by default. This lab benchmarks six **GAIO (Generative AI Optimization)** measures that make Shadow DOM content machine-readable:

| Measure                    | Technique                                                |
| -------------------------- | -------------------------------------------------------- |
| **JSON-LD**                | Structured `schema.org` data in `<head>`                 |
| **Semantic HTML**          | `<section>`, `<article>`, `<aside>` landmark wrappers    |
| **ARIA**                   | `aria-label` / `aria-labelledby` on custom element hosts |
| `<noscript>`               | Light DOM fallbacks for no-JS parsers                    |
| **Declarative Shadow DOM** | SSR-rendered shadow content via `@lit-labs/ssr`          |
| **Microdata**              | Inline `itemscope` / `itemprop` attributes               |

## Research Questions

- **RQ1** — Does adding JSON-LD structured data to a Shadow DOM page improve the accuracy and completeness of LLM-based content extraction compared to a bare control?
- **RQ2** — Do semantic HTML5 landmark elements (`<article>`, `<aside>`, `<figure>`) improve scope disambiguation for LLM extractors?
- **RQ3** — Does ARIA labelling on Web Component hosts improve form-field detection by LLMs?

Each GAIO measure is isolated to a separate page variant to quantify its independent contribution. Seven deliberate test traps are embedded to create meaningful per-variant signals. See [`docs/test-design.md`](docs/test-design.md) for the full methodology and [`docs/traps.md`](docs/traps.md) for the trap specifications.

## Live Deployment

Eight variants of the same insurance page content, each isolating a single GAIO variable:

| Variant                | GAIO Measure                                          | URL                                                                      |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Control                | None — bare Shadow DOM baseline                       | [/control](https://gaio-validation-lab.vercel.app/control)               |
| Combined               | All measures combined                                 | [/combined](https://gaio-validation-lab.vercel.app/combined)             |
| JSON-LD only           | Structured data in `<head>`                           | [/test-jsonld](https://gaio-validation-lab.vercel.app/test-jsonld)       |
| Semantic HTML only     | `<section>`, `<article>`, `<aside>` wrappers          | [/test-semantic](https://gaio-validation-lab.vercel.app/test-semantic)   |
| ARIA only              | `aria-label` / `aria-labelledby` on host elements     | [/test-aria](https://gaio-validation-lab.vercel.app/test-aria)           |
| `<noscript>` only      | Light DOM fallbacks for no-JS crawlers                | [/test-noscript](https://gaio-validation-lab.vercel.app/test-noscript)   |
| Declarative Shadow DOM | SSR-rendered shadow content via `@lit-labs/ssr`       | [/test-dsd](https://gaio-validation-lab.vercel.app/test-dsd)             |
| Microdata only         | Inline `schema.org` `itemscope`/`itemprop` attributes | [/test-microdata](https://gaio-validation-lab.vercel.app/test-microdata) |

## Quick Start

```bash
npm install
npm run dev    # development server
npm run build  # production build
```

Copy `.env.example` to `.env` and add your API keys. See [`docs/replication.md`](docs/replication.md) for full step-by-step replication instructions, including LLM evaluation and result persistence.

## Project Structure

```
src/
  components/baseline/   ← 9 Lit web components (Shadow DOM)
    dxp-form-base.ts     ← shared base class for form components
  data/
    content.ts           ← shared page copy/constants for all 8 variants
    variants.mjs         ← shared variant IDs/paths for pages, scripts, middleware
  layouts/BaseLayout.astro ← Shared page shell
  lib/lit-ssr.ts          ← @lit-labs/ssr helper for Declarative Shadow DOM
  lib/supabase.mjs        ← shared Supabase insert utility for scripts + middleware
  middleware.ts           ← AI bot detection + Supabase logging
  pages/
    control/             ← Baseline — no GAIO measures
    combined/            ← All GAIO measures combined
    test-jsonld/         ← Isolated: JSON-LD
    test-semantic/       ← Isolated: Semantic HTML
    test-aria/           ← Isolated: ARIA attributes
    test-noscript/       ← Isolated: <noscript> fallbacks
    test-dsd/            ← Isolated: Declarative Shadow DOM
    test-microdata/      ← Isolated: Microdata
scripts/
  evaluate.mjs           ← Multi-provider LLM extraction benchmark
  test-bots.mjs          ← Bot UA simulation
  test-extract.mjs       ← Structural content extraction
  indexnow.mjs           ← Submit all variant URLs to IndexNow (Bing)
supabase/
  schema.sql             ← DDL v2: enums, tables, views, and RLS policies
results/                 ← Local evaluation CSVs (gitignored; generated by npm run evaluate:*)
docs/
  database.md            ← Supabase setup, table contracts, view queries, validation checks
  test-design.md         ← Variant matrix, BaseLayout, methodology, research questions
  traps.md               ← Seven test traps and signal matrix
  evaluation.md          ← LLM evaluation script reference
  scripts.md             ← All scripts and middleware reference
  replication.md         ← Step-by-step replication guide
  results-interpretation.md ← How to read and analyse the CSV outputs
```

## Documentation

| Document                                                         | Contents                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [docs/test-design.md](docs/test-design.md)                       | Multi-arm variant design, constants, BaseLayout, research questions, methodology |
| [docs/traps.md](docs/traps.md)                                   | Seven embedded test traps with per-variant implementation and signal matrix      |
| [docs/database.md](docs/database.md)                             | Supabase schema setup, writer payload contracts, and view query examples         |
| [docs/evaluation.md](docs/evaluation.md)                         | LLM evaluation script — commands, models, env vars, Supabase schema              |
| [docs/scripts.md](docs/scripts.md)                               | Bot simulation, content extraction, middleware reference                         |
| [docs/replication.md](docs/replication.md)                       | Full step-by-step replication guide                                              |
| [docs/results-interpretation.md](docs/results-interpretation.md) | How to read and analyse the evaluation CSV outputs                               |

## Technologies

- **Astro 5** · **Lit 3** · **@lit-labs/ssr** · **TypeScript**
- **openai** · **@anthropic-ai/sdk** · **@google/generative-ai**
- **Supabase** · **Vercel**
