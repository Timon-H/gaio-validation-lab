/**
 * Simulated DXP Button Component
 *
 * Mirrors the real dxp-button from the DXP design system.
 * Original: Lit-based, extends Action base class, Shadow DOM encapsulated.
 *
 * Features replicated:
 * - @customElement('dxp-button') registration
 * - disabled property
 * - ARIA attributes (aria-expanded, aria-controls, aria-label)
 * - Slot-based content projection (icon, image, subtitle, default)
 * - Event tracking attributes (data-event-label, data-event-type, etc.)
 * - Click handler delegation
 */
import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

@customElement("dxp-button")
export class DxpButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      font-family: inherit;
      font-size: 1rem;
      padding: 0.625rem 1.25rem;
      border: 2px solid var(--dxp-button-border-color, #0066cc);
      background: var(--dxp-button-bg, #0066cc);
      color: var(--dxp-button-color, #ffffff);
      border-radius: var(--dxp-button-radius, 4px);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition:
        background-color 0.2s,
        border-color 0.2s;
    }

    button:hover:not(:disabled) {
      background: var(--dxp-button-bg-hover, #004c99);
      border-color: var(--dxp-button-border-hover, #004c99);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :host([variant="secondary"]) button {
      background: transparent;
      color: var(--dxp-button-border-color, #0066cc);
    }

    :host([variant="secondary"]) button:hover:not(:disabled) {
      background: var(--dxp-button-bg-hover, rgba(0, 102, 204, 0.1));
    }

    :host([variant="link"]) button {
      background: transparent;
      border: none;
      color: var(--dxp-button-border-color, #0066cc);
      padding: 0.25rem 0.5rem;
      text-decoration: underline;
    }

    .image-label-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .titles-container {
      display: flex;
      flex-direction: column;
    }

    #subtitle {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    #subtitle:empty,
    #label:empty {
      display: none;
    }
  `;

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  @property({ type: String, attribute: "variant", reflect: true })
  variant: "primary" | "secondary" | "link" = "primary";

  @property({ type: String, attribute: "icon" })
  icon?: string;

  @property({ type: String, attribute: "action-aria-label" })
  actionAriaLabel?: string;

  @property({ type: String, attribute: "button-aria-expanded" })
  buttonAriaExpanded?: string;

  @property({ type: String, attribute: "button-aria-controls" })
  buttonAriaControls?: string;

  @property({ type: String, attribute: "data-event-label" })
  dataEventLabel?: string;

  @property({ type: String, attribute: "data-event-type" })
  dataEventType?: string;

  @property({ type: String, attribute: "data-event-variant" })
  dataEventVariant?: string;

  @property({ type: String, attribute: "data-event-color" })
  dataEventColor?: string;

  render() {
    return html`
      <button
        id="clickTarget"
        data-event-label=${ifDefined(this.dataEventLabel)}
        data-event-type=${ifDefined(this.dataEventType)}
        data-event-variant=${ifDefined(this.dataEventVariant)}
        data-event-color=${ifDefined(this.dataEventColor)}
        aria-label=${ifDefined(this.actionAriaLabel)}
        ?disabled=${this.disabled}
        aria-expanded=${ifDefined(this.buttonAriaExpanded)}
        aria-controls=${ifDefined(this.buttonAriaControls)}
      >
        <slot name="icon">
          ${this.icon ? html`<span class="icon">${this.icon}</span>` : nothing}
        </slot>
        <div class="image-label-container">
          <slot name="image"></slot>
          <div class="titles-container">
            <span id="label"><slot></slot></span>
            <span id="subtitle"><slot name="subtitle"></slot></span>
          </div>
        </div>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dxp-button": DxpButton;
  }
}
