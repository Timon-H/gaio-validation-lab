/**
 * Simulated DXP Accordion Element Component
 * 
 * Mirrors the real dxp-accordion-element from the DXP design system.
 * Original: Lit-based LitElement, Shadow DOM encapsulated.
 * 
 * Features replicated:
 * - @customElement('dxp-accordion-element') registration
 * - expanded property with reflect
 * - Toggle via click and keyboard (Enter / Space)
 * - ARIA attributes (aria-expanded, aria-controls, aria-hidden, role)
 * - Custom event dispatching (TOGGLE_ACCORDION_ELEMENT)
 * - Slot-based content: headline slot + default slot for body
 * - Focus management on expand
 * - data-event-label tracking attribute
 * - categories attribute for filtering
 */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { TOGGLE_ACCORDION_ELEMENT } from './dxp-accordion.js';

@customElement('dxp-accordion-element')
export class DxpAccordionElement extends LitElement {

  static styles = css`
    :host {
      display: block;
    }

    .accordion-item {
      overflow: hidden;
    }

    .accordion-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      cursor: pointer;
      user-select: none;
      background: var(--dxp-accordion-header-bg, transparent);
      transition: background-color 0.2s;
    }

    .accordion-header:hover {
      background: var(--dxp-accordion-header-hover, #f5f5f5);
    }

    .accordion-header:focus-visible {
      outline: 2px solid var(--dxp-focus-color, #0066cc);
      outline-offset: -2px;
    }

    .icon {
      transition: transform 0.3s ease;
      font-size: 1.25rem;
      color: var(--dxp-accordion-icon-color, #0066cc);
    }

    .icon.toggle-icon {
      transform: rotate(180deg);
    }

    .accordion-body {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
      padding: 0 1rem;
    }

    .accordion-body.show-content {
      max-height: 2000px;
      padding: 1rem;
    }
  `;

  @property({ type: String, reflect: true })
  id: string = '';

  @property({ type: Boolean, attribute: 'expanded', reflect: true })
  expanded: boolean = false;

  @property({ type: String, attribute: 'data-event-label' })
  dataEventLabel: string = '';

  @property({ type: String, attribute: 'categories', reflect: true })
  categories: string = '';

  toggle() {
    this.expanded = !this.expanded;
    const event = new CustomEvent(TOGGLE_ACCORDION_ELEMENT, {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      this.toggle();
      event.preventDefault();
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('expanded') && this.expanded) {
      this.updateComplete.then(() => {
        const content = this.shadowRoot?.getElementById('accordion-body');
        content?.focus();
      });
    }
  }

  render() {
    return html`
      <section class="accordion-item">
        <div
          class="accordion-header${this.expanded ? ' open' : ''}"
          @click="${this.toggle}"
          @keydown="${this.handleKeydown}"
          tabindex="0"
          role="button"
          aria-expanded="${this.expanded}"
          aria-controls="accordion-body"
          data-event-label="${this.dataEventLabel}"
          id="accordion-header"
        >
          <slot name="headline"></slot>
          <span class="icon ${this.expanded ? 'toggle-icon' : ''}">▼</span>
        </div>
        <div
          id="accordion-body"
          aria-hidden="${this.expanded ? 'false' : 'true'}"
          class="accordion-body ${this.expanded ? 'show-content' : ''}"
          role="region"
          aria-labelledby="accordion-header"
          tabindex="-1"
        >
          <slot></slot>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dxp-accordion-element': DxpAccordionElement;
  }
}
