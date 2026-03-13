/**
 * Simulated DXP Accordion Component
 *
 * Mirrors the real dxp-accordion from the DXP design system.
 * Original: Lit-based LitElement, Shadow DOM encapsulated.
 *
 * Features replicated:
 * - @customElement('dxp-accordion') registration
 * - multi mode (allow multiple panels open)
 * - no-scroll option
 * - sticky-elements-height for scroll offset
 * - Listens for toggle events from dxp-accordion-element children
 * - Hash-based auto-opening
 * - Slot-based content projection
 */
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export const TOGGLE_ACCORDION_ELEMENT = "@dxp-accordion-element/toggle";

@customElement("dxp-accordion")
export class DxpAccordion extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    ::slotted(dxp-accordion-element) {
      border-bottom: 1px solid var(--dxp-accordion-border, #e0e0e0);
    }

    ::slotted(dxp-accordion-element:first-child) {
      border-top: 1px solid var(--dxp-accordion-border, #e0e0e0);
    }
  `;

  @property({ type: Boolean, attribute: "multi" })
  multi: boolean = false;

  @property({ type: Boolean, attribute: "no-scroll" })
  noScroll: boolean = false;

  @property({ type: Number, attribute: "sticky-elements-height" })
  stickyElementsHeight: number = 0;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      TOGGLE_ACCORDION_ELEMENT,
      this._handleToggleEvent as EventListener,
    );

    // Hash-based auto-opening
    const hash = window.location.hash.replace("#", "");
    if (hash && hash.length > 0) {
      this._openById(hash);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      TOGGLE_ACCORDION_ELEMENT,
      this._handleToggleEvent as EventListener,
    );
  }

  private _openById(id: string) {
    const children = Array.from(this.children) as HTMLElement[];
    children.forEach((el) => {
      if (el.id === id) {
        el.setAttribute("expanded", "");
      }
    });
  }

  private _handleToggleEvent(event: CustomEvent) {
    const element = event.target as HTMLElement;

    if (!this.multi) {
      const children = Array.from(this.children) as HTMLElement[];
      children.forEach((el) => {
        if (el !== element) {
          el.removeAttribute("expanded");
          (el as any).expanded = false;
        }
      });
    }

    if (!this.noScroll) {
      this._scrollToElement(element);
    }
  }

  private _scrollToElement(target: Element) {
    setTimeout(() => {
      window.scrollTo({
        top:
          target.getBoundingClientRect().top +
          window.scrollY -
          this.stickyElementsHeight,
        behavior: "smooth",
      });
    }, 2);
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dxp-accordion": DxpAccordion;
  }
}
