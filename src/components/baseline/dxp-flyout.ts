/**
 * Simulated DXP Flyout Component
 *
 * Mirrors the real dxp-flyout from the DXP design system.
 * Original: Lit-based, extends DxpHTMLElement, Shadow DOM encapsulated.
 *
 * Features replicated:
 * - @customElement('dxp-flyout') registration
 * - open/close toggle behavior via content slot click
 * - Flyout positioning: left, center, right
 * - Full-width responsive breakpoint option
 * - Close button(s)
 * - Configurable: triangle, shadow, close symbol, transparent bg
 * - Open direction: upwards support
 * - Click-outside-to-close behavior
 * - Slot-based: content (trigger), flyout (panel content)
 * - phone / hours data attributes: when set, contact info renders inside shadow DOM
 *   so Declarative Shadow DOM is the sole data channel (slot="flyout" is then absent)
 * - Other flyout auto-close when new one opens
 */
import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

export type FlyoutPosition = "left" | "right" | "center";

@customElement("dxp-flyout")
export class DxpFlyout extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    .flyout-container {
      display: none;
      position: absolute;
      z-index: 1000;
      background: var(--dxp-flyout-bg, #fff);
      border-radius: var(--dxp-flyout-radius, 8px);
      min-width: 200px;
      max-width: 400px;
      padding: 1rem;
    }

    :host(:not([hide-shadow])) .flyout-container {
      box-shadow: var(--dxp-flyout-shadow, 0 4px 20px rgba(0, 0, 0, 0.15));
    }

    :host([transparent-background]) .flyout-container {
      background: transparent;
      box-shadow: none;
    }

    :host([open]) .flyout-container {
      display: block;
    }

    /* Positioning */
    :host(:not([open-upwards])) .flyout-container {
      top: 100%;
      margin-top: 0.5rem;
    }

    :host([open-upwards]) .flyout-container {
      bottom: 100%;
      margin-bottom: 0.5rem;
    }

    :host([flyout-position="left"]) .flyout-container {
      left: 0;
    }

    :host([flyout-position="right"]) .flyout-container {
      right: 0;
    }

    :host([flyout-position="center"]) .flyout-container,
    :host(:not([flyout-position])) .flyout-container {
      left: 50%;
      transform: translateX(-50%);
    }

    .triangle {
      display: none;
    }

    :host([open]:not([hide-triangle])) .triangle {
      display: block;
      position: absolute;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid var(--dxp-flyout-bg, #fff);
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: -7px;
      z-index: 1001;
    }

    .close-flyout-button {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.25rem;
      color: #666;
      padding: 0.25rem;
      line-height: 1;
    }

    .close-flyout-button:hover {
      color: #333;
    }

    :host([hide-close-symbol]) .close-flyout-button {
      display: none;
    }

    ::slotted([slot="content"]) {
      cursor: pointer;
    }
  `;

  @property({ type: String, reflect: true })
  open: string | undefined;

  @property({ type: String, attribute: "flyout-position", reflect: true })
  flyoutPosition: FlyoutPosition = "center";

  @property({ type: String, attribute: "flyout-full-width-below" })
  flyoutFullWidthBelow?: string;

  @property({ type: Boolean, attribute: "thinner-navigation", reflect: true })
  thinnerNavigation: boolean = false;

  @property({ type: Boolean, attribute: "hide-close-symbol", reflect: true })
  hideCloseSymbol: boolean = false;

  @property({ type: Boolean, attribute: "hide-shadow", reflect: true })
  hideShadow: boolean = false;

  @property({ type: Boolean, attribute: "hide-triangle", reflect: true })
  hideTriangle: boolean = false;

  @property({
    type: Boolean,
    attribute: "transparent-background",
    reflect: true,
  })
  transparentBackground: boolean = false;

  @property({ type: Boolean, attribute: "open-upwards", reflect: true })
  isOpenUpwards: boolean = false;

  // Data attributes: when set, contact info renders inside shadow DOM rather than via
  // the slot="flyout" light DOM child. This makes DSD the sole accessible channel —
  // both attributes are stripped by the evaluation pipeline before the LLM sees the
  // HTML, so only the DSD-rendered <template shadowrootmode="open"> content survives.
  @property({ type: String, attribute: "phone" })
  phone: string = "";

  @property({ type: String, attribute: "hours" })
  hours: string = "";

  connectedCallback() {
    super.connectedCallback();
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    document.addEventListener("click", this._handleOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this._handleOutsideClick);
  }

  firstUpdated() {
    const trigger = this.querySelector('[slot="content"]');
    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggle();
    });
  }

  private _handleOutsideClick() {
    if (this.hasAttribute("open")) {
      this._close();
    }
  }

  private _toggle() {
    // Close other flyouts
    document.querySelectorAll("dxp-flyout[open]").forEach((el) => {
      if (el !== this) el.removeAttribute("open");
    });

    this.toggleAttribute("open");
  }

  private _close() {
    this.removeAttribute("open");
  }

  render() {
    return html`
      <slot name="content"></slot>
      <div class="triangle"></div>
      <div class="flyout-container" @click=${(e: Event) => e.stopPropagation()}>
        ${!this.hideCloseSymbol
          ? html`
              <button class="close-flyout-button" @click=${this._close}>
                ✕
              </button>
            `
          : nothing}
        ${this.phone || this.hours
          ? html`
              <div style="padding: 0.5rem;">
                <p style="margin: 0 0 0.5rem;">
                  <strong>Kundenservice</strong>
                </p>
                ${this.phone
                  ? html`<p style="margin: 0;">Telefon: ${this.phone}</p>`
                  : nothing}
                ${this.hours
                  ? html`<p style="margin: 0;">${this.hours}</p>`
                  : nothing}
              </div>
            `
          : html`<slot name="flyout"></slot>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dxp-flyout": DxpFlyout;
  }
}
