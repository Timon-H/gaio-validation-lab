# gaio-validation-lab

[![Quality](https://github.com/Timon-H/gaio-validation-lab/actions/workflows/quality.yml/badge.svg)](https://github.com/Timon-H/gaio-validation-lab/actions/workflows/quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.10-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![Lit](https://img.shields.io/badge/Lit-3-324fff?logo=lit&logoColor=white)](https://lit.dev/)
[![Vercel](https://img.shields.io/badge/Live%20on-Vercel-000000?logo=vercel&logoColor=white)](https://gaio-validation-lab.vercel.app)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)

## Thesis Metadata

- **Author:** Timon Hargesheimer
- **Academic Context:** Master's thesis, HTW Berlin (2026)
- **Software Development Period:** 2026-01 to 2026-04
- **Final Evaluation Data Collection Period:** 2026-03-13 to 2026-03-14
- **Later Simulated Runs (diagnostic only):** Additional March runs were executed for `bot_logs` and `extraction_results` (simulated data, not part of the final LLM evaluation window).
- **Archived DOI:** [10.5281/zenodo.19439383](https://doi.org/10.5281/zenodo.19439383)
- **Thesis snapshot release:** [`v1.1-thesis`](https://github.com/Timon-H/gaio-validation-lab/releases/tag/v1.1-thesis)

This repository benchmarks how different HTML markup techniques affect content extraction from Web Components with **Shadow DOM encapsulation** by AI crawlers and large language models.

Shadow DOM — used extensively in component-driven DXP architectures — is opaque to most AI crawlers by default. This lab benchmarks three paired **GAIO (Generative AI Optimization)** axes that make Shadow DOM content machine-readable:

| Axis Group                 | Paired Measures                           | Technique Focus                                                                             |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Structured Data Axis**   | **JSON-LD / Microdata**                   | `schema.org` signals in `<head>` (JSON-LD) and inline attributes (`itemscope` / `itemprop`) |
| **Visibility Bridge Axis** | **Declarative Shadow DOM / `<noscript>`** | SSR-rendered shadow serialization (`@lit-labs/ssr`) vs Light DOM fallback channel           |
| **Semantic Context Axis**  | **ARIA / Semantic HTML**                  | Host-level accessibility semantics and document landmark structure                          |

> **Note:** `<noscript>` is included as an isolated variant and in exploratory combined variants, but is not part of the canonical combined stack. See the variant matrix below for details.

### Research Questions

- **RQ1:** How do semantic and structural markup measures impact the extraction quality (precision, recall, F1) of LLMs at the isolated DOM level for content initially encapsulated in a Shadow DOM?
- **RQ2:** Which of the isolated GAIO measures (JSON-LD, Semantic HTML, ARIA, Declarative Shadow DOM, Microdata, and <noscript>) contribute most effectively to improving precision and reducing fallback hallucinations under API-driven, schema-strict laboratory conditions?
- **RQ3:** To what extent can the observed effects of these markup techniques be generalized across different LLM providers (OpenAI, Anthropic, Google) under direct API control, or do provider-specific differences exist?

Each GAIO measure is isolated to a separate canonical page variant to quantify its independent contribution. Seven deliberate test traps are embedded to create meaningful per-variant signals. See [`docs/test-design.md`](docs/test-design.md) for the full methodology and [`docs/traps.md`](docs/traps.md) for the trap specifications.

## Live Deployment

Canonical benchmark matrix (8 variants):

Axis labels used below:

- Structured Data = JSON-LD / Microdata
- Semantic Context = ARIA / Semantic HTML
- Visibility Bridge = DSD / `<noscript>`

| Variant                | Axis Group                | GAIO Measure                                                               | URL                                                                      |
| ---------------------- | ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Control                | None                      | None — bare Shadow DOM baseline                                            | [/control](https://gaio-validation-lab.vercel.app/control)               |
| Combined               | Cross-axis combined stack | JSON-LD + Semantic + ARIA + DSD + Microdata; `<noscript>` remains isolated | [/combined](https://gaio-validation-lab.vercel.app/combined)             |
| JSON-LD only           | Structured Data           | JSON-LD member (`<head>` graph)                                            | [/test-jsonld](https://gaio-validation-lab.vercel.app/test-jsonld)       |
| Microdata only         | Structured Data           | Microdata member (inline attributes)                                       | [/test-microdata](https://gaio-validation-lab.vercel.app/test-microdata) |
| Semantic HTML only     | Semantic Context          | Semantic HTML member (landmarks)                                           | [/test-semantic](https://gaio-validation-lab.vercel.app/test-semantic)   |
| ARIA only              | Semantic Context          | ARIA member (host accessibility semantics)                                 | [/test-aria](https://gaio-validation-lab.vercel.app/test-aria)           |
| `<noscript>` only      | Visibility Bridge         | `<noscript>` member (Light DOM fallback)                                   | [/test-noscript](https://gaio-validation-lab.vercel.app/test-noscript)   |
| Declarative Shadow DOM | Visibility Bridge         | DSD member (SSR-rendered shadow content)                                   | [/test-dsd](https://gaio-validation-lab.vercel.app/test-dsd)             |

Exploratory visibility-axis pair (optional, not part of canonical trial statistics):

| Variant           | Purpose                                                        | URL                                                                            |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Combined DSD      | Alias of canonical combined variant (DSD visibility channel)   | [/combined-dsd](https://gaio-validation-lab.vercel.app/combined-dsd)           |
| Combined noscript | Combined stack with noscript visibility channel instead of DSD | [/combined-noscript](https://gaio-validation-lab.vercel.app/combined-noscript) |

## Quick Start

```bash
npm install
npm run dev    # development server (Astro)
npm run build  # production build (Astro)
npm run lint   # formatting + markdown checks (Prettier + markdownlint)
```

**Linting and formatting:**

- `npm run lint` runs Prettier (`format:check`) and markdownlint (`lint:md`).
- `npm run lint:staged` (pre-commit) auto-fixes staged files using Prettier and markdownlint (see `lint-staged` in package.json).

**Testing and evaluation:**

- `npm run test:bots`, `npm run test:extract`, `npm run test:integrity`, and `npm run test:all` run integration/simulation scripts (see scripts/).
- `npm run test:ci` runs all tests in a CI environment using `start-server-and-test`.
- `npm run export:datasets` exports full Supabase tables/views into `datasets/DATA_*.csv`.

**Environment variables:**
Copy `.env.example` to `.env` and fill in the required values:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (from your Supabase project; required for logging and persistence)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (for LLM evaluation; only the key for the provider you use is required)

See comments in `.env.example` for details. See [`docs/replication.md`](docs/replication.md) for full step-by-step replication instructions, including LLM evaluation and result persistence.

## Quality Workflow

- `npm run lint` runs Prettier and markdownlint checks.
- `npm run build` runs Astro type-check and production build.
- `npm run test:ci` runs all experiment checks in CI (see scripts/ and package.json).
- A pre-commit hook (via simple-git-hooks) runs `npm run lint:staged` on staged files (see package.json for configuration).
- GitHub Actions runs the same gate in `.github/workflows/quality.yml`.

## Project Structure

```
src/
  components/baseline/     ← 10 Lit web components (Shadow DOM)
    dxp-form-base.ts       ← shared base class for form components
  components/traps/        ← 7 test trap components (signal disambiguation)
  data/
    content.ts             ← shared page copy/constants for canonical + exploratory variants
    variants.mjs           ← shared canonical + exploratory variant IDs/paths (split exports)
  layouts/BaseLayout.astro ← Shared page shell
  lib/lit-ssr.ts           ← @lit-labs/ssr helper for Declarative Shadow DOM
  lib/supabase.mjs         ← shared Supabase insert utility for scripts + middleware
  middleware.ts            ← AI bot detection + Supabase logging
  pages/
    control/               ← Baseline — no GAIO measures
    combined/              ← Combined stack (JSON-LD + Semantic + ARIA + DSD + Microdata)
    combined-dsd/          ← Exploratory alias of combined (DSD visibility channel)
    combined-noscript/     ← Exploratory combined variant with noscript visibility channel
    test-jsonld/           ← Isolated: JSON-LD
    test-semantic/         ← Isolated: Semantic HTML
    test-aria/             ← Isolated: ARIA attributes
    test-noscript/         ← Isolated: <noscript> fallbacks
    test-dsd/              ← Isolated: Declarative Shadow DOM
    test-microdata/        ← Isolated: Microdata
scripts/
  evaluate.mjs             ← Multi-provider LLM extraction benchmark (tier/profile controls + metadata)
  bootstrap_ci_all_tiers.py ← Bootstrap 95% CI post-processing for Macro-F1 (primary/validation/exploratory)
  export-datasets.mjs      ← Export Supabase tables/views to curated DATA_*.csv snapshots
  test-bots.mjs            ← Bot UA simulation
  test-extract.mjs         ← Structural content extraction
  test-integrity.mjs       ← Variant/header/marker integrity gate
supabase/
  schema.sql               ← DDL v2: enums, tables, views, and RLS policies
results/
  gaio_evaluation_<provider>_<model>_<timestamp>.csv ← Runtime-generated evaluation outputs (gitignored)
datasets/
  DATA_llm_evaluation_results_rows.csv                  ← Canonical raw benchmark snapshot (table export)
  DATA_llm_evaluation_results_exploratory_rows.csv      ← Exploratory raw benchmark snapshot (table export)
  DATA_llm_eval_comparison_rows.csv                     ← Canonical aggregated view snapshot
  DATA_llm_eval_comparison_exploratory_rows.csv         ← Exploratory aggregated view snapshot
  DATA_v_macro_f1_scores_rows.csv                       ← Canonical macro-F1 view snapshot
  DATA_v_macro_f1_scores_exploratory_rows.csv           ← Exploratory macro-F1 view snapshot
public/                    ← Static assets (robots.txt, etc.)
docs/
  database.md              ← Supabase setup, table contracts, view queries, validation checks
  test-design.md           ← Variant matrix, BaseLayout, methodology, research questions
  traps.md                 ← Seven test traps and signal matrix
  evaluation.md            ← LLM evaluation script reference
  scripts.md               ← All scripts and middleware reference
  replication.md           ← Step-by-step replication guide
  results-interpretation.md ← How to read and analyse the CSV outputs
.env.example               ← Environment variable template
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

## Runtime Results vs Curated Datasets

The repository separates local runtime outputs from curated thesis datasets:

- **Script-generated run files** (runtime output):
  `results/gaio_evaluation_<provider>_<model>_<timestamp>.csv`
  These are produced by `scripts/evaluate.mjs` during benchmarking and stay local (gitignored).
- **Curated thesis dataset snapshots** (`DATA_*.csv`):
  `datasets/DATA_*.csv`
  Manually exported reference datasets used for analysis, reproducibility, and thesis reporting.

## Bootstrap CI Post-Processing

For uncertainty quantification of run-level Macro-F1 values, use:

`scripts/bootstrap_ci_all_tiers.py`

The script reads `datasets/DATA_llm_evaluation_results_rows.csv` and computes
95% bootstrap confidence intervals for any supported tier and variant.

Examples:

```bash
# Primary tier, canonical combined variant
python scripts/bootstrap_ci_all_tiers.py \
  --csv datasets/DATA_llm_evaluation_results_rows.csv \
  --tier primary \
  --variant combined

# Validation tier
python scripts/bootstrap_ci_all_tiers.py \
  --csv datasets/DATA_llm_evaluation_results_rows.csv \
  --tier validation \
  --variant combined

# Exploratory tier
python scripts/bootstrap_ci_all_tiers.py \
  --csv datasets/DATA_llm_evaluation_results_rows.csv \
  --tier exploratory \
  --variant combined
```

Optional flags:

- `--bootstrap <n>`: number of resamples (default: 10000)
- `--seed <n>`: RNG seed (default: 42)
- `--collapse-profiles`: aggregate across thinking profiles per provider/model

Current curated snapshot files:

- `datasets/DATA_llm_evaluation_results_rows.csv` -> export of canonical raw rows (`llm_evaluation_results`)
- `datasets/DATA_llm_evaluation_results_exploratory_rows.csv` -> export of exploratory raw rows (`llm_evaluation_results_exploratory`)
- `datasets/DATA_llm_eval_comparison_rows.csv` -> export of canonical aggregate view (`llm_eval_comparison`)
- `datasets/DATA_llm_eval_comparison_exploratory_rows.csv` -> export of exploratory aggregate view (`llm_eval_comparison_exploratory`)
- `datasets/DATA_v_macro_f1_scores_rows.csv` -> export of canonical macro-F1 view (`v_macro_f1_scores`)
- `datasets/DATA_v_macro_f1_scores_exploratory_rows.csv` -> export of exploratory macro-F1 view (`v_macro_f1_scores_exploratory`)

## Technologies

- **Astro 5** · **Lit 3** · **@lit-labs/ssr** · **TypeScript** . **Python**
- **openai** · **@anthropic-ai/sdk** · **@google/generative-ai**
- **Supabase** · **Vercel**
- **Prettier** · **markdownlint-cli2** · **lint-staged** · **simple-git-hooks** · **start-server-and-test**

> **Note:** This list covers core and developer-facing technologies. Some build, formatting, and CI tools are only used in development and may not be required for all users.

> **Disclaimer:** This README summarizes the main workflow and technologies. For full details, see `package.json`, `.env.example`, and the `docs/` directory. If you find any gaps or have questions, please open an issue or consult the documentation.
