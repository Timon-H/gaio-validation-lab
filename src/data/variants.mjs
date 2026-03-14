/**
 * Shared variant definitions used across middleware, evaluation scripts,
 * and test scripts.
 *
 * `VARIANTS` contains the canonical 8-arm matrix used by middleware,
 * bot/integrity checks, and persisted Supabase runs.
 *
 * `EXPLORATORY_VARIANTS` contains optional sensitivity routes used for
 * targeted comparisons (for example, visibility-axis swap checks).
 *
 * Plain .mjs so both Astro's TS pipeline (via middleware.ts) and Node
 * scripts (evaluate.mjs, test-extract.mjs, etc.) can import it directly.
 */

/** @type {ReadonlyArray<{ id: string, path: string }>} */
export const VARIANTS = Object.freeze([
  { id: "control", path: "/control" },
  { id: "jsonld", path: "/test-jsonld" },
  { id: "semantic", path: "/test-semantic" },
  { id: "aria", path: "/test-aria" },
  { id: "noscript", path: "/test-noscript" },
  { id: "dsd", path: "/test-dsd" },
  { id: "microdata", path: "/test-microdata" },
  { id: "combined", path: "/combined" },
]);

/** @type {ReadonlyArray<{ id: string, path: string }>} */
export const EXPLORATORY_VARIANTS = Object.freeze([
  { id: "combined-dsd", path: "/combined-dsd" },
  { id: "combined-noscript", path: "/combined-noscript" },
]);

/** Canonical + exploratory variants together. */
export const ALL_VARIANTS = Object.freeze([
  ...VARIANTS,
  ...EXPLORATORY_VARIANTS,
]);

/** Just the IDs (e.g. for CLI validation). */
export const VARIANT_IDS = VARIANTS.map((v) => v.id);

/** Just the variant paths including leading slash (e.g. '/control'). */
export const VARIANT_PATHS = VARIANTS.map((v) => v.path);

/** IDs for canonical + exploratory variants. */
export const ALL_VARIANT_IDS = ALL_VARIANTS.map((v) => v.id);

/** Paths for canonical + exploratory variants. */
export const ALL_VARIANT_PATHS = ALL_VARIANTS.map((v) => v.path);
