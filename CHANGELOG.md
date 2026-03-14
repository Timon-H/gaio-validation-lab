# Changelog

All notable changes to this project are documented in this file.

## [1.0.1] - 2026-03-13

### Added

- Quality automation baseline:
  - GitHub Actions workflow at `.github/workflows/quality.yml`
  - `test:ci` server-backed gate using `start-server-and-test`
  - `test:integrity` experiment invariants check (`scripts/test-integrity.mjs`)
- Pre-commit automation:
  - `simple-git-hooks` `pre-commit` hook
  - `lint-staged` staged-file formatting/linting

### Documentation

- Updated README and script/replication docs to cover quality gates, integrity checks, CI workflow, and pre-commit hooks.

## [1.0.0] - 2026-03-13

### Release Summary

- First formal v1 release baseline for the GAIO validation lab.
- Full implementation assessment executed against Refactoring priorities.
- Additional database, telemetry, and documentation work delivered.
- Current verification status: `npm run build` passes (0 errors, 0 warnings, 0 hints).

### Planned Refactoring Implementation Assessment

| Priority                                    | Status                              | Assessment Summary                                                                                                                                                                                                  | Key Evidence                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Shared content extraction                | Complete (with structure deviation) | Shared content moved to one module and consumed by all 8 variant pages. Known drift fixes were implemented, including radio default consistency and JSON-LD naming consistency through shared schema builder usage. | `src/data/content.ts`, `src/pages/control/index.astro`, `src/pages/test-jsonld/index.astro`, `src/pages/test-semantic/index.astro`, `src/pages/test-aria/index.astro`, `src/pages/test-noscript/index.astro`, `src/pages/test-dsd/index.astro`, `src/pages/test-microdata/index.astro`, `src/pages/combined/index.astro` |
| 2. Shared variants constant                 | Complete                            | Canonical variant definitions centralized in `.mjs` and imported by middleware and all target scripts.                                                                                                              | `src/data/variants.mjs`, `src/middleware.ts`, `scripts/evaluate.mjs`, `scripts/test-extract.mjs`, `scripts/test-bots.mjs`, `scripts/indexnow.mjs`                                                                                                                                                                        |
| 3. Form base class                          | Complete                            | Abstract base class introduced and adopted by text input, dropdown, and radio components to remove duplicated style/property/event logic.                                                                           | `src/components/baseline/dxp-form-base.ts`, `src/components/baseline/dxp-text-input.ts`, `src/components/baseline/dxp-dropdown.ts`, `src/components/baseline/dxp-input-radio.ts`                                                                                                                                         |
| 4. Shared Supabase insert utility           | Complete                            | Reusable insert helper added and integrated into middleware and both persistence scripts.                                                                                                                           | `src/lib/supabase.mjs`, `src/middleware.ts`, `scripts/evaluate.mjs`, `scripts/test-extract.mjs`                                                                                                                                                                                                                          |
| 5. Lit normalization                        | Complete (with scope adjustment)    | `nothing` normalization applied where empty-string fallback branches existed; radio invalid-state naming aligned (`invalid`), and redundant `mandatory` removed.                                                    | `src/components/baseline/dxp-button.ts`, `src/components/baseline/dxp-card.ts`, `src/components/baseline/dxp-input-radio.ts`                                                                                                                                                                                             |
| 6. Magic numbers to constants               | Complete                            | Named constants introduced for middleware timeout, provider retry/backoff controls, and script fetch/text limits.                                                                                                   | `src/middleware.ts`, `scripts/evaluate.mjs`, `scripts/test-extract.mjs`, `scripts/test-bots.mjs`                                                                                                                                                                                                                         |
| 7. Dependency classification + indexnow env | Complete                            | LLM SDKs moved to `devDependencies`; `indexnow` script now loads `.env`.                                                                                                                                            | `package.json`                                                                                                                                                                                                                                                                                                           |
| 8. Trap duplication reduction               | Complete (plus extra refactors)     | Planned trap dedup refactors delivered for the three specified files, with additional cleanup in related trap components.                                                                                           | `src/components/traps/TrapAriaHiddenBonus.astro`, `src/components/traps/TrapCrossSell.astro`, `src/components/traps/TrapHiddenFaq.astro`, `src/components/traps/TrapDeprecatedTariff.astro`, `src/components/traps/TrapTestimonial.astro`                                                                                |

### Notes On Planned-vs-Actual Shape

- Priority 1 data structures in `content.ts` are normalized as keyed objects for direct access patterns instead of strict array-only shapes.
- Priority 5 accordion change request was effectively not required because no empty-string fallback branch remained to normalize in current accordion render flow.

### Additional Delivered Work

- Canonical variant ID alignment across runtime paths (`variant_id` adoption in middleware, scripts, and schema).
- New trap barrel export and page-level trap import standardization.
- Supabase schema redesign (v2) with enums, stronger constraints, indexes, analytics views, and permissive lab RLS.
- Added and validated analytics views: `gaio_comparison`, `extraction_comparison`, `llm_eval_comparison`.
- Extended persistence payloads with richer metadata such as `tier`, `base_url`, and request URL context where applicable.
- Added dedicated database operations guide and synchronized major docs/README references.
- Updated interpretation guide to the latest Claude run snapshot.

### Validation Snapshot Used For v1

- Static validation: `npm run build` successful.
- Runtime evaluation persistence check: successful row persistence for evaluation pipeline.
- Runtime extraction persistence check: successful multi-variant inserts.
- Runtime view checks: all three comparison views queried successfully.

### v1 Scope Statement

- v1.0.0 marks the first consolidated baseline where shared content/constants, shared data contracts, persistence utilities, schema v2, and documentation are aligned around the current GAIO experiment design.
