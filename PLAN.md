# Code Quality Implementation Plan

## Priority 1: Extract shared content into `src/data/content.ts`

Create `src/data/content.ts` exporting all shared content strings used across the 8 page variants.

**What it exports:**
- `PAGE_TITLE`, `PAGE_DESCRIPTION` — page-level metadata
- `INTRO` — `{ heading, description }` for the intro section
- `BUTTONS` — array of `{ label, disabled? }`
- `TEXT_INPUTS` — array of `{ label, name, type?, placeholder, regex?, regexErrorText?, requiredErrorText }`
- `DROPDOWN` — `{ label, name, placeholder, options }` (options as JSON string)
- `RADIO` — `{ label, name, default, options }` (options as JSON string)
- `FAQS` — array of `{ headline, body }`
- `CARDS` — array of `{ title, description, badge?, button }`
- `FLYOUT` — `{ phone, hours, button, position }`
- `TARIFF` — `{ headline, subHeadline, data }` (data as JSON string)
- `FOOTER_LINK` — `{ text, href }`
- `SECTION_HEADINGS` — object keyed by section ID with `{ heading, description }` (used only by semantic/combined)
- `ARIA_LABELS` — object keyed by component with ARIA label strings (used only by aria/combined)

**Pages updated:** All 8 pages import from `content.ts` instead of hardcoding strings. This also fixes the known drift bugs:
- `test-dsd` missing `default="monatlich"` on the radio
- `test-jsonld` JSON-LD `name` field missing "DXP " prefix

**Files created:** `src/data/content.ts`
**Files modified:** All 8 `src/pages/*/index.astro`

---

## Priority 2: Create shared `variants` constant

Create `src/data/variants.ts` exporting the variant list used across scripts and middleware.

**What it exports:**
- `VARIANTS` — array of `{ id, path }` objects (e.g., `{ id: 'control', path: '/control' }`)
- `VARIANT_IDS` — string array of just the IDs
- `VARIANT_PATHS` — string array of just the paths

**Files created:** `src/data/variants.ts`
**Files modified:**
- `src/middleware.ts` — import `VARIANT_PATHS`, replace 8-line pathname check
- `scripts/evaluate.mjs` — import `VARIANTS`
- `scripts/test-extract.mjs` — derive from import
- `scripts/test-bots.mjs` — derive from import
- `scripts/indexnow.mjs` — derive from import

Since scripts use `.mjs` and can't directly import `.ts`, the file will be `src/data/variants.mjs` (plain JS) so both the middleware (via Astro's TS pipeline) and the scripts (via Node) can import it.

---

## Priority 3: Create `DxpFormElement` base class

Create `src/components/baseline/dxp-form-base.ts` — an abstract LitElement base class for form components.

**Extracted into base class:**
- **Shared CSS** via a static `formBaseStyles` export: `:host`, `label`, `.label-row`, `.tooltip`, `.error-message` styles
- **Shared properties**: `name`, `label`, `default`, `required`, `requiredErrorText`
- **`firstUpdated()`**: apply default value pattern
- **`_dispatchEvent()` helper**: `new CustomEvent(name, { detail, bubbles: true, composed: true })`
- **Label+tooltip render helper**: `renderLabel(forId)` method returning the label-row template

**Files created:** `src/components/baseline/dxp-form-base.ts`
**Files modified:**
- `dxp-text-input.ts` — extend `DxpFormBase`, remove duplicated CSS/properties/methods
- `dxp-dropdown.ts` — extend `DxpFormBase`, remove duplicated CSS/properties/methods
- `dxp-input-radio.ts` — extend `DxpFormBase`, remove duplicated CSS/properties/methods

**Not changed:** Error state property names (`_invalid` vs `_error`) and attribute names (`invalid` vs `error`) stay as-is per component since changing them would break external CSS/selectors. The base class provides the common pattern but each subclass defines its own reflected error property.

---

## Priority 4: Create shared `supabaseInsert` utility

Create `src/lib/supabase.mjs` with a reusable Supabase insert function.

**What it exports:**
```js
export async function supabaseInsert(table, payload, { timeout } = {})
```
- Reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `process.env`
- Optional `timeout` parameter (for middleware's 1s abort controller)
- Returns `{ ok: boolean, status?: number, error?: string }`

**Files created:** `src/lib/supabase.mjs`
**Files modified:**
- `src/middleware.ts` — import and use `supabaseInsert('bot_logs', logData, { timeout: 1000 })`
- `scripts/evaluate.mjs` — import and use `supabaseInsert('llm_evaluation_results', payload)`
- `scripts/test-extract.mjs` — import and use `supabaseInsert('extraction_results', payload)`

---

## Priority 5: Normalize Lit component inconsistencies

### 5a. Normalize `nothing` vs empty string
In `dxp-accordion.ts`, `dxp-button.ts`, `dxp-card.ts`: replace `''` falsy branches with `nothing` (import from `lit`). This is a rendering correctness fix — `''` creates empty text nodes.

### 5b. Normalize error state attribute name
Rename `dxp-input-radio.ts` error property from `_error`/`error` to `_invalid`/`invalid` to match text-input and dropdown.

### 5c. Remove redundant `mandatory` property
In `dxp-input-radio.ts`: remove `mandatory` property, keep only `required`.

**Files modified:** `dxp-accordion.ts`, `dxp-button.ts`, `dxp-card.ts`, `dxp-input-radio.ts`

---

## Priority 6: Replace magic numbers with named constants

Add named constants in the files where magic numbers currently appear:

- `middleware.ts`: `const SUPABASE_TIMEOUT_MS = 1000;`
- `evaluate.mjs`: `const OPENAI_SEED = 42;`, `const MAX_TOKENS = 2048;`, `const RETRY_BUFFER_MS = 2000;`, `const BACKOFF_INTERVAL_MS = 15_000;`, `const INTER_REQUEST_DELAY_MS = 1000;`
- `test-extract.mjs`: `const FETCH_TIMEOUT_MS = 4000;`, `const MAX_TEXT_LENGTH = 10_000;`
- `test-bots.mjs`: `const FETCH_TIMEOUT_MS = 4000;`

**Files modified:** `middleware.ts`, `evaluate.mjs`, `test-extract.mjs`, `test-bots.mjs`

---

## Priority 7: Move LLM SDKs to `devDependencies`

Move `openai`, `@anthropic-ai/sdk`, and `@google/generative-ai` from `dependencies` to `devDependencies` in `package.json`. These are only used by `scripts/evaluate.mjs` (a dev-time script), not by the Astro application at runtime.

Also add `--env-file=.env` to the `indexnow` npm script (currently missing, unlike all others).

**Files modified:** `package.json`

---

## Priority 8: Reduce trap component duplication

Refactor the three most duplicated trap components to extract shared content into frontmatter variables:

### TrapAriaHiddenBonus.astro
Define the inner card content once, vary only the wrapper element tag + attributes using Astro's dynamic element approach.

### TrapCrossSell.astro
Define inner content block once, use `Fragment` with conditional wrapper.

### TrapHiddenFaq.astro
Define the accordion element attributes once, conditionally add `aria-hidden`.

**Files modified:** `TrapAriaHiddenBonus.astro`, `TrapCrossSell.astro`, `TrapHiddenFaq.astro`

---

## What is NOT changed (and why)

- **Event naming** (`@TextInput/input` vs `@Dropdown/change`): These are public API surface. Changing them could break consumers. Noted but not acted on.
- **HTML entity encoding** in traps: Functionally identical, cosmetic only.
- **Inline styles** in traps/pages: These are test fixtures, not production UI. Extracting CSS would add indirection without meaningful benefit.
- **Trap file naming** (no trap numbers): The JSDoc headers are the authority. Adding numbers to filenames would create coupling and require renaming if trap order changes.

---

## Implementation order

1 → 2 → 7 → 6 → 4 → 5 → 3 → 8

Rationale: Start with the highest-impact content extraction (1), then the shared variants constant (2) since pages will be open for editing already. Then the simple `package.json` fix (7) and magic numbers (6) since they're quick wins. Then the Supabase utility (4), Lit normalization (5), the base class (3), and finally trap cleanup (8).
