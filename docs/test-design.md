# Test Design

## Multi-Arm Structure

Canonical benchmark matrix (8 variants). Each variant isolates a single GAIO variable so its effect on LLM extraction can be measured independently.

Axis convention used throughout docs:

- Structured Data Axis = JSON-LD / Microdata
- Semantic Context Axis = ARIA / Semantic HTML
- Visibility Bridge Axis = DSD / `<noscript>`

| Variant           | Structured Data Axis | Semantic Context Axis | Visibility Bridge Axis |
| ----------------- | -------------------- | --------------------- | ---------------------- |
| `/control`        | —                    | —                     | —                      |
| `/test-jsonld`    | JSON-LD              | —                     | —                      |
| `/test-semantic`  | —                    | Semantic HTML         | —                      |
| `/test-aria`      | —                    | ARIA                  | —                      |
| `/test-noscript`  | —                    | —                     | `<noscript>`           |
| `/test-dsd`       | —                    | —                     | DSD                    |
| `/test-microdata` | Microdata            | —                     | —                      |
| `/combined`       | JSON-LD + Microdata  | ARIA + Semantic HTML  | DSD                    |

**Hydration note:** `/combined` and `/test-dsd` are SSR-only to keep the initial HTML deterministic for crawler/LLM evaluation and to avoid client-side re-rendering artifacts.

### Exploratory Visibility-Axis Pair (Optional)

Two additional routes are available for a focused sensitivity check of the visibility axis and are **not** part of the canonical 8-arm trial statistics:

| Route                | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `/combined-dsd`      | Alias of canonical `/combined` (visibility via DSD)               |
| `/combined-noscript` | Same combined stack with visibility via `noscript` instead of DSD |

This pair is used to address the methodological question why `noscript` is excluded from canonical `/combined`, without changing the primary study design.

### Constants across all variants

- Same 9 Lit web components with Shadow DOM encapsulation
- Same content (insurance FAQ, tariff comparison, form fields, product cards)
- Traditional SEO signals (robots meta, canonical URL) on every page
- Same BaseLayout styling shell
- All canonical 8 variants are covered by the extraction and bot test scripts.
- Exploratory routes are evaluated via `evaluate.mjs` only and are excluded from canonical bot/integrity checks.

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

- **RQ1:** How do semantic and structural markup measures impact the extraction quality (precision, recall, F1) of LLMs at the isolated DOM level for content initially encapsulated in a Shadow DOM?
- **RQ2:** Which of the isolated GAIO measures (JSON-LD, Semantic HTML, ARIA, Declarative Shadow DOM, Microdata, and <noscript>) contribute most effectively to improving precision and reducing fallback hallucinations under API-driven, schema-strict laboratory conditions?
- **RQ3:** To what extent can the observed effects of these markup techniques be generalized across different LLM providers (OpenAI, Anthropic, Google) under direct API control, or do provider-specific differences exist?

### Hypotheses

| Hypothesis                                                                                                       | Trap(s)    | Measure            |
| ---------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ |
| H1 — Semantic HTML causes LLMs to exclude the KFZ cross-sell block from tariff extraction                        | Trap 1     | `tarife` count = n |
| H2 — Semantic HTML causes LLMs to exclude the testimonial price from tariff extraction                           | Trap 4     | `tarife` accuracy  |
| H3 — Semantic HTML causes LLMs to exclude the deprecated tariff from active offers                               | Trap 5     | `tarife` accuracy  |
| H4 — ARIA labels expose the unlabelled number input to LLM field detection                                       | Trap 2     | `formFelder` count |
| H5 — ARIA labels expose the CSS-only labelled input to LLM field detection                                       | Trap 3     | `formFelder` count |
| H6 — JSON-LD / Microdata structured data excludes noise prices from tariff extraction                            | Traps 4, 5 | `tarife` accuracy  |
| H7 — ARIA `aria-hidden` suppresses a tariff-like card from LLM extraction                                        | Trap 6     | `tarife` count = 3 |
| H8 — ARIA `aria-hidden` on a Web Component host suppresses slotted light DOM content (see _Threats to Validity_) | Trap 7     | `faq` count = 3    |

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
- The LLM evaluation script runs each variant × provider combination **n times** with strongest available per-provider variance controls (`temperature`, `seed`, and thinking-depth controls where exposed). Results are reported as mean ± standard deviation.
- Compare variant outputs against the control baseline to quantify the independent contribution of each GAIO measure.

### Threats to Validity

- **LLM non-determinism:** control surfaces are provider-specific. The benchmark applies strongest available controls, but strict determinism is not achievable across providers. Repeated runs are used to estimate variance.
- **Hydration artifacts:** client-side rendering changes the DOM post-load and can confound results. SSR-only variants (`/combined`, `/test-dsd`) are fully deterministic. For JS-hydrated variants, the evaluation fetches the initial server-rendered HTML before hydration.
- **Content–language mismatch:** the system prompt is written in German to match the page content, reducing extraction bias from language mismatch.
- **Single-site deployment:** all variants share the same domain and server; results reflect this controlled environment and may not generalise to other hosting configurations.
- **Provider-specific behaviour:** different LLM providers (OpenAI, Claude, Gemini) may respond differently to identical markup signals. Cross-provider comparison is included to surface model-level confounds.
- **Asymmetric thinking controls:** Gemini `2.5-flash` can disable thinking (`thinkingBudget=0`), Gemini `2.5-pro` cannot fully disable thinking (minimum `thinkingBudget=128`), and Claude extended thinking is opt-in. This asymmetry is handled via explicit control profiles and reported as a methodological limitation.
- **Navigation context leakage:** `BaseLayout` includes a `<nav>` listing all eight variant names (e.g. "JSON-LD", "Semantic", "ARIA"). To prevent this from revealing the experimental design to the LLM evaluator, the evaluation script strips `<nav>` blocks from the HTML before submission.
- **`aria-hidden` and Web Component light DOM:** `aria-hidden="true"` on a custom element host does not suppress slotted light DOM content in raw HTML. LLMs parsing raw HTML may therefore not respect it as a suppression signal (Trap 7). The trap tests _whether_ LLMs honour `aria-hidden` on WC hosts — null results are themselves a valid finding.
- **Host element attribute visibility:** the `tariffs` JSON attribute on `<dxp-tariff-comparison>` is visible in all variants, including the control — host attributes are public in Shadow DOM. Tariff count discrimination therefore relies on scope and accuracy signals (traps 1, 4, 5) rather than raw data visibility.

### Reporting

- Report results per variant and summarise deltas vs. baseline (control).
- Findings apply to initial HTML visibility, not interactive behaviour.
- Statistical summary: mean ± SD across n runs per variant × provider.
