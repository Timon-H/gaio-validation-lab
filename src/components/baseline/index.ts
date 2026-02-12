/**
 * Simulated DXP Design System Components - Barrel Export
 * 
 * These are standalone simulations of the DXP (internal DXP) web components,
 * built with Lit and following the same API patterns as the originals:
 * 
 * - @customElement decorator with 'dxp-*' naming convention
 * - Shadow DOM encapsulation
 * - TypeScript typed properties with @property decorator
 * - Slot-based content projection
 * - Custom event dispatching
 * - ARIA accessibility attributes
 * - CSS custom properties for theming (white-label default)
 * 
 * These simulations avoid internal dependencies (@/utils, FormAssociated, etc.)
 * while preserving the public API surface and rendering behavior
 * for A/B testing purposes.
 */

export { DxpButton } from './dxp-button.js';
export { DxpAccordion } from './dxp-accordion.js';
export { DxpAccordionElement } from './dxp-accordion-element.js';
export { DxpCard } from './dxp-card.js';
export { DxpTextInput } from './dxp-text-input.js';
export { DxpDropdown } from './dxp-dropdown.js';
export { DxpFlyout } from './dxp-flyout.js';
export { DxpInputRadio } from './dxp-input-radio.js';
export { DxpTariffComparison } from './dxp-tariff-comparison.js';
