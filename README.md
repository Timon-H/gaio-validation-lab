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
  test-bots.sh           ← Bot UA simulation tests
  test-content-extraction.sh ← Content extraction + optional Supabase persist
/supabase
  schema.sql             ← DDL for bot_logs, extraction_results
```

## Multi-Arm Test Design

Seven variants of the same insurance page content. Each isolates a single GAIO variable for scientific measurement.

| Variant | JSON-LD | Semantic HTML | ARIA | Noscript | DSD |
|---------|:-------:|:------------:|:----:|:--------:|:---:|
| `/control` | — | — | — | — | — |
| `/test-jsonld-only` | ✅ | — | — | — | — |
| `/test-semantic-only` | — | ✅ | — | — | — |
| `/test-aria-only` | — | — | ✅ | — | — |
| `/test-noscript-only` | — | — | — | ✅ | — |
| `/test-dsd` | — | — | — | — | ✅ |
| `/combined` | ✅ | ✅ | ✅ | — | ✅ |

**Hydration toggle note:** `/combined` and `/test-dsd` default to SSR-only to avoid duplicate late client rendering in production. For interactive comparison, append `?hydrate=1` to enable Lit hydration and element upgrades on-demand.

### Constants across all variants
- Same 9 Lit web components with Shadow DOM encapsulation
- Same content (insurance FAQ, tariff comparison, form fields, product cards)
- Traditional SEO signals (robots meta, canonical URL) on every page
- Same BaseLayout styling shell

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

## Testing

```bash
# Simulate AI bot visits across all 7 variants
npm run test:bots

# Extract content and compare structural markers
npm run test:extract

# Extract + persist results to Supabase
npm run test:extract:persist
```

## Middleware

The middleware detects 6 AI crawlers (GPTBot, Claude-Web, Google-Extended, PerplexityBot, CCBot, Applebot-Extended) and logs visits to Supabase `bot_logs` with variant path, latency, and status code.

## Technologies

- **Astro 5**: SSR mode with `@astrojs/vercel` adapter
- **Lit 3**: Web components with Shadow DOM encapsulation
- **@lit-labs/ssr**: Server-side rendering to Declarative Shadow DOM
- **TypeScript**: Strict mode
- **Supabase**: Bot logging + extraction results
- **Vercel**: Serverless deployment
