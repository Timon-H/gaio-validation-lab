# Test Design

## Multi-Arm Structure

Eight variants of the same insurance page content. Each isolates a single GAIO variable so its effect on LLM extraction can be measured independently.

| Variant | JSON-LD | Semantic HTML | ARIA | Noscript | DSD | Microdata |
|---------|:-------:|:------------:|:----:|:--------:|:---:|:---------:|
| `/control` | — | — | — | — | — | — |
| `/test-jsonld` | ✅ | — | — | — | — | — |
| `/test-semantic` | — | ✅ | — | — | — | — |
| `/test-aria` | — | — | ✅ | — | — | — |
| `/test-noscript` | — | — | — | ✅ | — | — |
| `/test-dsd` | — | — | — | — | ✅ | — |
| `/test-microdata` | — | — | — | — | — | ✅ |
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

### Research Questions

- **RQ1** — Does adding JSON-LD structured data to a Shadow DOM page improve the accuracy and completeness of LLM-based content extraction compared to a bare control?
- **RQ2** — Do semantic HTML5 landmark elements (`<article>`, `<aside>`, `<figure>`, `<s>`) improve scope disambiguation for LLM extractors?
- **RQ3** — Does ARIA labelling on Web Component hosts improve form-field detection by LLMs?

### Hypotheses

| Hypothesis | Trap(s) | Measure |
|---|---|---|
| H1 — Semantic HTML causes LLMs to exclude the KFZ cross-sell block from tariff extraction | Trap 1 | `tarife` count = n
| H2 — Semantic HTML causes LLMs to exclude the testimonial price from tariff extraction | Trap 4 | `tarife` accuracy |
| H3 — Semantic HTML causes LLMs to exclude the deprecated tariff from active offers | Trap 5 | `tarife` accuracy |
| H4 — ARIA labels expose the unlabelled range slider to LLM field detection | Trap 2 | `formFelder` count |
| H5 — ARIA labels expose the CSS-only labelled input to LLM field detection | Trap 3 | `formFelder` count |
| H6 — JSON-LD / Microdata structured data excludes noise prices from tariff extraction | Traps 4, 5 | `tarife` accuracy |
| H7 — ARIA `aria-hidden` suppresses a tariff-like card from LLM extraction | Trap 6 | `tarife` count = 3 |
| H8 — ARIA `aria-hidden` on a Web Component host suppresses slotted light DOM content | Trap 7 | `faq` count = 3 |

### Objective

Measure how different GAIO measures affect crawler/LLM extraction from the **initial HTML response** of Shadow DOM components.

### Variables

- **Independent variables:** JSON-LD, Semantic HTML, ARIA on hosts, `<noscript>` fallbacks, Declarative Shadow DOM (DSD), Microdata.
- **Dependent variables:** extraction quality and structure (word count, headings, links, entity mentions, schema capture, etc.).
- **Controls:** identical content, component set, layout, and SEO constants across all variants.

### Scope and Constraints

- SSR-only is used for `/combined` and `/test-dsd` to keep HTML deterministic and avoid client re-render artifacts.
- Client-side interactivity is **not** part of the measurement scope.

### Measurement Approach

- Use the extraction script to capture text content, structural markers, and schema presence per variant.
- The LLM evaluation script runs each variant × provider combination **n times** with `temperature: 0.0` and `seed: 42` for reproducibility. Results are reported as mean ± standard deviation.
- Compare variant outputs against the control baseline to quantify the independent contribution of each GAIO measure.

### Threats to Validity

- **LLM non-determinism:** fixed `temperature: 0.0` and `seed: 42` (where supported) hold output stable; n repetitions per run allow variance measurement.
- **Hydration artifacts:** client-side rendering changes the DOM post-load and can confound results. SSR-only variants (`/combined`, `/test-dsd`) are fully deterministic. For JS-hydrated variants, the evaluation fetches the initial server-rendered HTML before hydration.
- **Content–language mismatch:** the system prompt is written in German to match the page content, reducing extraction bias from language mismatch.
- **Single-site deployment:** all variants share the same domain and server; results reflect this controlled environment and may not generalise to other hosting configurations.
- **Provider-specific behaviour:** different LLM providers (OpenAI, Claude, Gemini) may respond differently to identical markup signals. Cross-provider comparison is included to surface model-level confounds.
- **Navigation context leakage:** `BaseLayout` includes a `<nav>` listing all eight variant names (e.g. "JSON-LD", "Semantic", "ARIA"). To prevent this from revealing the experimental design to the LLM evaluator, the evaluation script strips `<nav>` blocks from the HTML before submission.
- **`aria-hidden` and Web Component light DOM:** `aria-hidden="true"` on a custom element host does not suppress slotted light DOM content in raw HTML. LLMs parsing raw HTML may therefore not respect it as a suppression signal (Trap 7). The trap tests *whether* LLMs honour `aria-hidden` on WC hosts — null results are themselves a valid finding.
- **Host element attribute visibility:** the `tariffs` JSON attribute on `<dxp-tariff-comparison>` is visible in all variants, including the control — host attributes are public in Shadow DOM. Tariff count discrimination therefore relies on scope and accuracy signals (traps 1, 4, 5) rather than raw data visibility.

### Reporting

- Report results per variant and summarise deltas vs. baseline (control).
- Findings apply to initial HTML visibility, not interactive behaviour.
- Statistical summary: mean ± SD across n runs per variant × provider.
