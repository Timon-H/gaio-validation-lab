# Results Interpretation

Column reference and analysis guide for the CSV outputs produced by `scripts/evaluate.mjs`.

This version is calibrated to the following Claude run:

`results/gaio_evaluation_claude_claude-haiku-4-5_2026-03-13T16-16-56.csv`

---

## CSV Format

Each evaluation run produces a file named:

```
results/gaio_evaluation_<provider>_<model>_<timestamp>.csv
```

### Column Reference

| Column              | Type        | Description                                                                                      |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `Provider`          | string      | LLM provider: `openai`, `claude`, or `gemini`                                                    |
| `Model`             | string      | Concrete model used for the run (for example `gpt-4.1-mini`, `claude-sonnet-4-5`)                |
| `Tier`              | string      | Tier selected via CLI: `primary`, `validation`, `exploratory`                                    |
| `Thinking_Controls` | string      | Serialized control metadata including profile and provider-specific control settings             |
| `Variant_ID`        | string      | Variant key: `control`, `jsonld`, `semantic`, `aria`, `noscript`, `dsd`, `microdata`, `combined` |
| `Run`               | integer     | Repetition index within one execution (1..n)                                                     |
| `Tarife`            | integer     | Number of tariffs extracted                                                                      |
| `FAQ`               | integer     | Number of FAQ entries extracted                                                                  |
| `Produktkarten`     | integer     | Number of product cards extracted                                                                |
| `FormFelder`        | integer     | Number of form fields extracted                                                                  |
| `Hat_Kontakt`       | 0 or 1      | Whether contact details were extracted (1 = yes)                                                 |
| `Hat_Anbieter`      | 0 or 1      | Whether provider name was extracted (1 = yes)                                                    |
| `DB`                | string      | Persistence status: `-`, `OK`, `ERR`, or `ERROR`                                                 |
| `Raw_JSON_Output`   | JSON string | Full structured output returned by the model                                                     |

---

## How To Read These Metrics

- `Tarife` primarily reflects tariff-scope robustness (cross-sell/noise suppression).
- `FAQ` reflects how well question-answer content survives component and visibility patterns.
- `Produktkarten` reflects capture of card-level product snippets.
- `FormFelder` reflects sensitivity to ARIA labelling, inferred labels, and field naming.
- `Hat_Kontakt` and `Hat_Anbieter` are coarse entity-presence checks.

Count metrics are necessary but not sufficient. Always inspect `Raw_JSON_Output` for semantic correctness.

---

## Claude Snapshot (2026-03-13, n = 1)

| Variant_ID  | Tarife | FAQ | Produktkarten | FormFelder | Hat_Kontakt | Hat_Anbieter |
| ----------- | -----: | --: | ------------: | ---------: | ----------: | -----------: |
| `control`   |      2 |   0 |             0 |          4 |           0 |            1 |
| `jsonld`    |      3 |   3 |             1 |          4 |           0 |            1 |
| `semantic`  |      3 |   0 |             2 |          6 |           0 |            1 |
| `aria`      |      4 |   3 |             2 |          6 |           1 |            1 |
| `noscript`  |      3 |   4 |             2 |          4 |           1 |            1 |
| `dsd`       |      3 |   4 |             2 |          5 |           1 |            1 |
| `microdata` |      3 |   3 |             2 |          4 |           1 |            1 |
| `combined`  |      3 |   3 |             2 |          6 |           1 |            1 |

### Quick Read

- `control` under-extracts strongly (low tariffs, zero FAQ, zero product cards, no contact).
- `jsonld`, `microdata`, and `combined` stabilize tariff count at 3.
- `aria` improves forms and contact, but over-extracts tariffs (`Tarife = 4`).
- `noscript` and `dsd` give the highest FAQ recall (`FAQ = 4`).
- `combined` is the most balanced profile in this run: stable tariffs plus high form-field coverage.

---

## Qualitative Signals From Raw JSON

| Variant     | Notable qualitative signal                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `control`   | Extracts only `Einsteiger-Tarif` and `Komfort-Plus`; no FAQ or cards returned.                               |
| `semantic`  | Includes `KFZ Basis` and `KFZ Komfort`, indicating scope drift into cross-sell content.                      |
| `aria`      | FAQ questions are present but answers are `null`; tariff list includes `Privathaftpflicht` as an extra item. |
| `noscript`  | Returns 4 FAQ items including the extra coverage-duration question.                                          |
| `dsd`       | Also returns 4 FAQ items and captures an additional free-text form field (`Pflichtfeld`).                    |
| `microdata` | Uses expanded tariff names (`Haftpflicht Basis/Komfort/Premium`) and normalized phone format (`+49-...`).    |
| `combined`  | Preserves structured naming (`Haftpflicht ...`), `zielgruppe = Privatpersonen`, and high form coverage.      |

The semantic and ARIA variants show why count-only evaluation can be misleading: numeric counts can look acceptable while item identity drifts.

---

## Trap-Oriented Interpretation (This Claude Run)

| Trap                                      | Signal in this run                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Trap 1 (cross-sell scope)                 | Scope leakage remains visible (`semantic` includes KFZ tariffs).                                           |
| Trap 2 (unlabelled number field)          | ARIA-rich variants (`aria`, `combined`) reach higher `FormFelder` counts.                                  |
| Trap 3 (CSS-only birth-year field)        | `aria` and `combined` expose the birth-year field clearly; others are less consistent.                     |
| Trap 4/5 (price noise, deprecated tariff) | `control` and `aria` show tariff instability relative to the 3-tariff target.                              |
| Trap 6 (bonus card suppression)           | `aria` still over-counts tariffs in this run, so suppression is not absolute.                              |
| Trap 7 (hidden FAQ item)                  | `noscript`/`dsd` return 4 FAQ entries; `aria`/`combined` return 3; `control`/`semantic` miss FAQ entirely. |

---

## Statistical Guidance For Follow-Up Runs

This file has one run per variant (`Run = 1`), so there is no within-file variance estimate.

For inferential comparison, run at least `repetitions >= 3` and aggregate by variant/provider:

```sql
SELECT
  variant_id,
  provider,
  model,
  tier,
  thinking_profile,
  runs,
  avg_tarife,
  avg_faq,
  avg_produktkarten,
  avg_form_felder,
  pct_kontakt,
  pct_anbieter
FROM llm_eval_comparison
WHERE provider = 'claude'
ORDER BY variant_id;
```

Minimal pandas summary from CSV files:

```python
import pandas as pd

df = pd.read_csv("results/gaio_evaluation_claude_claude-haiku-4-5_2026-03-13T16-16-56.csv")
summary = df.groupby("Variant_ID")[["Tarife", "FAQ", "Produktkarten", "FormFelder"]].agg(["mean", "std"])
print(summary)
```

With a single run, `std` will be `NaN`. That is expected.

---

## Supabase Views

When runs are persisted, use:

- `llm_eval_comparison` for canonical model extraction aggregates (`--persist`)
- `llm_eval_comparison_exploratory` for exploratory visibility aggregates (`--persist-exploratory`)
- `extraction_comparison` for structural marker extraction aggregates
- `gaio_comparison` for crawler telemetry aggregates

Practical API and SQL examples are documented in [`docs/database.md`](database.md).
