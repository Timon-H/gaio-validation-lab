# Results Interpretation

This document explains how to read and analyse the CSV outputs produced by `scripts/evaluate-gaio.mjs`.

---

## CSV Format

Each evaluation run produces a file named:

```
results/gaio_evaluation_<provider>_<timestamp>.csv
```

### Column Reference

| Column | Type | Description |
|---|---|---|
| `Provider` | string | LLM provider used: `openai`, `claude`, or `gemini` |
| `Variant_ID` | string | Page variant key: `control`, `jsonld`, `semantic`, `aria`, `noscript`, `dsd`, `microdata`, `combined` |
| `Run` | integer | Repetition index within this execution (1–n) |
| `Tarife` | integer | Number of insurance tariffs the LLM extracted |
| `FAQ` | integer | Number of FAQ pairs extracted |
| `Produktkarten` | integer | Number of product card entries extracted |
| `FormFelder` | integer | Number of form fields extracted (including ARIA-labelled fields) |
| `Hat_Kontakt` | 0 or 1 | Whether contact details were extracted (1 = yes) |
| `Hat_Anbieter` | 0 or 1 | Whether the provider name was extracted (1 = yes) |
| `DB` | string | Supabase persistence status: `OK`, `SKIPPED`, or an error message |
| `Raw_JSON_Output` | JSON string | The full structured JSON response from the LLM |

---

## Mapping Columns to Research Questions

| Column | Research Question | Relevant Traps |
|---|---|---|
| `Tarife` | RQ1 (JSON-LD), RQ2 (Semantic HTML) | Trap 1 (cross-sell scope), Trap 4 (testimonial price), Trap 5 (deprecated tariff) |
| `FormFelder` | RQ3 (ARIA labelling) | Trap 2 (unlabelled range slider), Trap 3 (CSS-only label) |
| `Hat_Anbieter` | RQ1 (JSON-LD) | Provider name is embedded in JSON-LD `schema.org` data |

---

## Expected Per-Variant Signals

The five embedded traps create the following expected patterns:

### `Tarife` count

| Variant | Expected | Reasoning |
|---|---|---|
| `control` | 3–5 | No scope markers; LLM may include KFZ cross-sell or noise prices |
| `semantic` | **3** | `<aside>` excludes KFZ cross-sell; `<blockquote>` excludes testimonial; `<s>` excludes deprecated entry |
| `aria` | 3–5 | No tariff-scope markers; same risk as control |
| `jsonld` | **3** | JSON-LD `Offer` list enumerates exactly 3 current tariffs |
| `noscript` | 3–5 | No scope markers for tariffs |
| `dsd` | 3–5 | DSD improves content visibility but provides no tariff-scope signal |
| `microdata` | **3** | `itemprop="offers"` scopes exactly the 3 live tariffs; deprecated entry has no annotation |
| `combined` | **3** | All scope signals active |

### `FormFelder` count

| Variant | Expected | Reasoning |
|---|---|---|
| `control` | 4–5 | Range slider and CSS-only label are not machine-readable |
| `aria` | **6+** | `aria-label` exposes the range slider and CSS-only birth-year field |
| `combined` | **6+** | ARIA labels active |
| all others | 4–5 | No ARIA labels on hidden/unlabelled fields |

---

## Statistical Analysis

Each provider run executes **n repetitions** per variant with `temperature: 0.0` and `seed: 42` (where supported). To summarise results:

1. **Per-run mean:** average `Tarife`, `FAQ`, `FormFelder` across the n `Run` values for each `Variant_ID`.
2. **Standard deviation:** low SD confirms deterministic extraction; high SD flags LLM non-determinism despite fixed temperature.
3. **Delta vs. control:** subtract the control mean from each variant mean to isolate the GAIO measure's contribution.

Example aggregation in SQL (works on the Supabase `llm_eval_comparison` view):

```sql
SELECT
  variant_id,
  provider,
  ROUND(AVG(tarife_count), 2)     AS avg_tarife,
  ROUND(STDDEV(tarife_count), 2)  AS sd_tarife,
  ROUND(AVG(form_felder_count), 2) AS avg_formfelder
FROM llm_evaluation_results
GROUP BY variant_id, provider
ORDER BY variant_id, provider;
```

Or in Python with pandas:

```python
import pandas as pd

df = pd.read_csv('results/gaio_evaluation_openai_<timestamp>.csv')
summary = df.groupby('Variant_ID')[['Tarife', 'FormFelder']].agg(['mean', 'std'])
print(summary)
```

---

## Worked Example (OpenAI, 2026-03-09)

The committed run `gaio_evaluation_openai_2026-03-09T15-31-42.csv` shows:

- **All variants return `Tarife = 3`** across all n runs. This suggests OpenAI's `gpt-4.1-mini` is robust to the noise prices (Traps 4 and 5) even without semantic markup — the plain German text "nicht mehr buchbar" (no longer bookable) may be sufficient context.
- **`FormFelder` is consistently 5** across all variants including ARIA variants. The trap signals (range slider, CSS-only label) did not produce the expected delta in this run. This is a finding in itself: it may indicate that `gpt-4.1-mini` extracts form fields from the surrounding text rather than from HTML structure alone.
- **`Hat_Anbieter`** is `1` for the `jsonld` variant (provider name extracted from JSON-LD) and `0` or inconsistent for other variants — confirming that JSON-LD improves entity extraction.

> **Note:** A single provider run is not sufficient to draw conclusions. Repeat runs with different providers and compare to identify model-level confounds. See [`docs/evaluation.md`](evaluation.md) for commands.

---

## Supabase `llm_eval_comparison` View

If results were persisted with `--persist`, the view aggregates across runs:

```
GET /rest/v1/llm_eval_comparison?select=*
```

Columns: `variant_id`, `provider`, `model`, `avg_tarife_count`, `avg_faq_count`, `avg_produktkarten_count`, `avg_form_felder_count`, `hat_kontakt_sum`, `hat_anbieter_sum`, `run_count`.

The `run_count` column shows how many individual runs were aggregated. A higher count (e.g. 9 = 3 runs × 3 repetitions) provides more reliable averages.

## GPT-4.1 Pilot Run — 2026-03-10 Observations

A single-repetition pilot with `gpt-4.1` (post-fix build) produced identical aggregate counts across all 8 variants:

| Metric | All Variants |
|--------|-------------|
| Tarife | 3 |
| FAQ | 3 |
| Produktkarten | 2 |
| FormFelder | 5 |

### Flat-Count Diagnosis

Identical counts do **not** mean the GAIO measures have no effect; they mean this model's capability ceiling is above the discriminating threshold for the current trap configuration. Three root causes were identified:

1. **Trap 2 (range slider)**: `type="range"` inputs are not classified as form fields by this model regardless of ARIA labelling. The field is excluded in every variant. → Fixed: changed to `type="number"` with opaque name `f_coverage`.
2. **Trap 3 (CSS label)**: `name="geburtsjahr"` was present in all variants, allowing the model to identify the field by its name attribute alone without any ARIA or label. → Fixed: changed to opaque `name="f_birth"` so only ARIA exposes field identity.
3. **Traps 1, 4, 5**: GPT-4.1 is robust enough to use in-text cues (cross-sell prose, "spare", "nicht mehr buchbar") rather than semantic signals. All three traps return correct counts despite the non-semantic variants.

### Sub-Surface Signals (Qualitative)

Despite flat counts, raw JSON extraction **does** vary by variant — confirming real GAIO effects:

| Variant | Observable Effect |
|---------|------------------|
| `microdata` | Tariff names expand: `"Basis"` → `"Haftpflicht Basis"` (model reads Microdata `name` property) |
| `microdata` | Contact phone uses `<meta>` format: `"+49-800-123-456-789"` vs. standard `"0800 123 456 789"` |
| `jsonld` | `zielgruppe` changes from `"Privatkunden"` → `"Privathaftpflichtversicherung"` (reads `about.name` from JSON-LD graph) |
| `combined` | `zahlungsperiode` normalises to `"pro Monat"` (text from combined JSON-LD + Microdata context) |

These sub-surface effects demonstrate that GAIO measures influence **information quality and extraction fidelity** even when aggregate counts are stable. This is an important finding for RQ2.

### Recommendations for Future Runs

- Use a lower-capability model (e.g., `gpt-4o-mini`, `gemini-flash`) to observe count-level discrimination from the hardened traps.
- Run `REPETITIONS=5` for statistical significance after confirming trap discrimination on a single run.
- Report both count-level and sub-surface JSON comparisons in the final analysis.