/**
 * Shared variant definitions used across middleware, evaluation scripts,
 * and test scripts. Single source of truth for page variant IDs and paths.
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

/** Just the IDs (e.g. for CLI validation). */
export const VARIANT_IDS = VARIANTS.map((v) => v.id);

/** Just the variant paths including leading slash (e.g. '/control'). */
export const VARIANT_PATHS = VARIANTS.map((v) => v.path);
