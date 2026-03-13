# Test Traps

The first round of evaluation produced identical extraction scores across all 8 variants (`3/3/2/4`) — LLMs recover content from raw text regardless of markup structure. Seven deliberate traps were then embedded — HTML structures that a GAIO-aware page should handle differently from a bare control page. Each trap tests whether a specific markup technique (semantic elements, ARIA attributes, structured data) changes what an LLM picks up as a valid extraction target.

---

## Trap 1 — Cross-sell Block (scope ambiguity)

**What it is:** A cross-selling block listing two motor tariffs ("KFZ Basis – 39,00 €" and "KFZ Komfort – 59,00 €") placed after the main Haftpflicht tariff comparison on the page.

**Per-variant implementation:**

| Variants                                                    | HTML wrapper                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| `control`, `aria`, `noscript`, `dsd`, `microdata`, `jsonld` | `<div>` — no structural distinction from the main content                 |
| `semantic`, `combined`                                      | `<aside>` — landmark element that denotes supplementary / related content |

**Expected signal (`tarife` count):**

- Non-semantic pages: LLM may include the 2 motor tariffs, returning **5** tariffs instead of 3.
- `semantic` / `combined`: The `<aside>` signals out-of-scope content; LLM should return **3** main tariffs.

The system prompt reinforces this: _"Erfasse nur die Haupttarife des primär beworbenen Produkts dieser Seite."_

---

## Trap 2 — Unlabelled Number Input (field visibility)

**What it is:** A number input (`<input type="number">`) for "Gewünschte Deckungssumme" placed in the form section. On non-ARIA pages it has no accessible label and an opaque `name` attribute (`f_coverage`), giving the LLM no cue to identify its purpose.

**Per-variant implementation:**

| Variants                                                        | Label                                           |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `control`, `semantic`, `noscript`, `dsd`, `microdata`, `jsonld` | No label element, no ARIA attribute             |
| `aria`, `combined`                                              | `aria-label="Gewünschte Deckungssumme in Euro"` |

**Expected signal (`formFelder` count):**

- Non-ARIA pages: LLM may not recognize the input as a named field.
- `aria` / `combined`: ARIA label exposes the field purpose; LLM should count it.

---

## Trap 3 — CSS-Only Label (field identity)

**What it is:** A birth-year text input whose visible label ("Geburtsjahr") is produced exclusively by a CSS `::before` pseudo-element — it does not exist in the HTML DOM and is invisible to parsers and LLMs.

**Per-variant implementation:**

| Variants                                                        | Label mechanism                                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `control`, `semantic`, `noscript`, `dsd`, `microdata`, `jsonld` | `.field-birth-year::before { content: "Pflichtfeld" }` — CSS only, opaque label, no ARIA |
| `aria`, `combined`                                              | `aria-label="Geburtsjahr eingeben"` on the `<input>`                                     |

**Expected signal (`formFelder` count):**

- CSS-only pages: LLM sees an unlabelled `<input type="text" name="f_birth">` — may miss it or list it without a name.
- `aria` / `combined`: ARIA label makes the field identity machine-readable; LLM should include it with its name.

---

## Trap 4 — Testimonial Price Noise (tariff scope)

**What it is:** A customer testimonial quote placed directly adjacent to the tariff comparison block. The quote contains a price figure ("12 € pro Monat") phrased as a first-person product statement (_"Bei meiner Police zahle ich nur 12 € pro Monat"_). Without `<blockquote>`, this is plausible as a tariff price. Comparative phrasing ("I save compared to…") was dropped, leaving `<blockquote>` as the sole disambiguation signal.

**Per-variant implementation:**

| Variants                                          | HTML wrapper                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `control`, `aria`, `noscript`, `dsd`, `microdata` | Bare `<p>` — no semantic distinction from product copy                                                                         |
| `semantic`, `combined`                            | `<figure>` / `<blockquote>` — semantic quotation landmark                                                                      |
| `jsonld`                                          | Bare `<p>`, but the JSON-LD `<script>` in `<head>` enumerates exactly 3 `Offer` objects, providing a machine-readable contract |

**Expected signal (`tarife` count / accuracy):**

- Non-semantic pages: LLM may treat `12 €` as a fourth tariff.
- `semantic` / `combined`: `<blockquote>` signals a quotation, not a product offer.
- `jsonld`: The structured `Offer` list in `<head>` acts as a ground truth; LLM should discard the `12 €` figure.

---

## Trap 5 — Deprecated Tariff Notice (temporal accuracy)

**What it is:** A notice about a discontinued tariff ("Früherer Einsteiger-Tarif war ab 1,99 € / Monat erhältlich – nicht mehr buchbar") placed before the live tariff comparison. The `1,99 €` price is plausible as a tariff but must not be extracted as a current offer.

**Per-variant implementation:**

| Variants                             | Markup                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `control`, `aria`, `noscript`, `dsd` | Bare `<p>` with ambiguous text ("Einsteiger-Tarif: ab 1,99 €") — no "discontinued" phrasing, so only the semantic `<s>` carries the obsolescence signal |
| `semantic`, `combined`               | `<s>` element — HTML semantic for content that is "no longer accurate or relevant"                                                                      |
| `microdata`                          | Bare `<p>`, but the page's three live tariffs each carry `itemprop="offers"` / `schema:Offer`; the deprecated notice has no structured data annotation  |
| `jsonld`                             | Bare `<p>`, but the JSON-LD `Offer` list in `<head>` includes only the 3 current tariffs                                                                |

**Expected signal (`tarife` count / accuracy):**

- `control`, `aria`, `noscript`, `dsd`: Ambiguous text with no explicit "not bookable" cue; LLM may include `1,99 €` as a fourth tariff.
- `semantic` / `combined`: `<s>` element communicates obsolescence.
- `microdata` / `jsonld`: Structured data scope excludes the deprecated entry.

---

## Trap 6 — aria-hidden Bonus Tariff Card (ARIA content suppression)

**What it is:** A "Komfort-Plus" tariff card (7,50 EUR/Monat, Deckungssumme: 20 Mio. EUR) placed directly above the tariff comparison table. Its text format is structurally identical to the three main tariff rows — no promotional language or qualifiers that allow a capable model to self-disambiguate it as non-primary content.

**Per-variant implementation:**

| Variants                                            | Markup                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `control`, `noscript`, `dsd`, `microdata`, `jsonld` | Bare `<div>` — no suppression cue                                               |
| `aria`                                              | `<div aria-hidden="true">` — ARIA marks the card as not part of primary content |
| `semantic`                                          | `<aside>` — landmark signals supplementary content                              |
| `combined`                                          | `<aside aria-hidden="true">` — both signals                                     |

**Note:** On `jsonld` and `microdata` pages the structured `offers` array enumerates exactly 3 `Offer` objects, providing an implicit scope boundary without any HTML-level suppression on the card itself.

**Expected signal (`tarife` count):**

- Non-ARIA, non-semantic pages: LLM may include "Komfort-Plus" → tarife = **4**
- `aria` / `combined`: `aria-hidden` suppresses the card → tarife = **3**
- `semantic` / `combined`: `<aside>` signals out-of-scope → tarife = **3**
- `jsonld` / `microdata`: structured Offer scope implicitly excludes the card → tarife = **3**

---

## Trap 7 — aria-hidden 4th FAQ Item (ARIA suppressive signal)

**What it is:** A fourth FAQ accordion item ("Wie lange ist mein Versicherungsschutz aktiv?") added after the three main FAQ entries. It is fully visible in the HTML DOM by default, testing whether `aria-hidden="true"` causes an LLM to _exclude_ content that is structurally present.

This trap tests ARIA in the **suppressive** direction — the inverse of Traps 2 and 3, which test ARIA in the _additive_ (labelling) direction.

**Per-variant implementation:**

| Variants                                            | Markup                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `control`, `dsd`, `semantic`, `microdata`, `jsonld` | Bare `<dxp-accordion-element>` — 4th FAQ fully visible                  |
| `noscript`                                          | Visible element + `<noscript>` fallback label — no suppression, faq = 4 |
| `aria`, `combined`                                  | `<dxp-accordion-element aria-hidden="true">` — ARIA suppresses the item |

**Design limitation:** `aria-hidden="true"` is set on the `<dxp-accordion-element>` _host_ element. In Shadow DOM, host `aria-hidden` propagates to the accessibility tree but does not remove slotted light DOM content from raw HTML. LLMs parsing raw HTML may extract the 4th FAQ regardless of this attribute. A uniform `faq=4` result is a valid null finding for H8.

> **Note:** The `jsonld` / `combined` FAQPage schema in `<head>` enumerates exactly 3 `Question` objects. Whether the model uses the JSON-LD count as a "ground truth" (returning 3 even when the HTML has 4) is itself a measurable GAIO effect.

**Expected signal (`faq` count):**

- Non-ARIA pages: faq = **4** (4th item visible)
- `aria` / `combined`: `aria-hidden` suppresses the 4th item → faq = **3**
