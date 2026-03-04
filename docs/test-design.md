# Test Design

## Multi-Arm Structure

Eight variants of the same insurance page content. Each isolates a single GAIO variable so its effect on LLM extraction can be measured independently.

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

**Hydration note:** `/combined` and `/test-dsd` are SSR-only to keep the initial HTML deterministic for crawler/LLM evaluation and to avoid client-side re-rendering artifacts.

### Constants across all variants

- Same 9 Lit web components with Shadow DOM encapsulation
- Same content (insurance FAQ, tariff comparison, form fields, product cards)
- Traditional SEO signals (robots meta, canonical URL) on every page
- Same BaseLayout styling shell
- All 8 variants are covered by the extraction and bot test scripts.

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

---

## Methodology

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
