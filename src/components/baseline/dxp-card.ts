/**
 * Simulated DXP Card Component
 * 
 * Mirrors the real dxp-card from the DXP design system.
 * Original: Lit-based LitElement, Shadow DOM, adaptive responsive styles.
 * 
 * Features replicated:
 * - @customElement('dxp-card') registration
 * - variant: vertical | horizontal | horizontal-reverse
 * - background-color attribute
 * - lowered style variation
 * - Extensive slot system: badge, header-title, subtitle, teaser-text,
 *   media, secondary-title, body-text, list, read-more, buttons, link, caption
 * - card-title / card-description data attributes: when set, content renders inside
 *   shadow DOM so Declarative Shadow DOM is the sole data channel (slots are then absent)
 * - Section visibility based on slotted content
 */
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type CardVariant = 'vertical' | 'horizontal' | 'horizontal-reverse';

@customElement('dxp-card')
export class DxpCard extends LitElement {

  static styles = css`
    :host {
      display: block;
    }

    .card {
      display: flex;
      flex-direction: column;
      background: var(--dxp-card-bg, #ffffff);
      border-radius: var(--dxp-card-radius, 8px);
      box-shadow: var(--dxp-card-shadow, 0 2px 8px rgba(0,0,0,0.1));
      overflow: hidden;
      height: 100%;
      transition: box-shadow 0.2s;
    }

    :host([lowered]) .card {
      box-shadow: var(--dxp-card-shadow-lowered, 0 1px 3px rgba(0,0,0,0.08));
    }

    .card:hover {
      box-shadow: var(--dxp-card-shadow-hover, 0 4px 16px rgba(0,0,0,0.15));
    }

    :host([variant="horizontal"]) .card,
    :host([variant="horizontal-reverse"]) .card {
      flex-direction: row;
    }

    :host([variant="horizontal-reverse"]) .card {
      flex-direction: row-reverse;
    }

    .media-section {
      position: relative;
      overflow: hidden;
    }

    :host([variant="horizontal"]) .media-section,
    :host([variant="horizontal-reverse"]) .media-section {
      flex: 0 0 40%;
    }

    ::slotted([slot="media"]) {
      width: 100%;
      height: auto;
      display: block;
    }

    .header {
      padding: 1rem 1rem 0;
    }

    .badge-container {
      margin-bottom: 0.5rem;
    }

    ::slotted([slot="badge"]) {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: bold;
      text-transform: uppercase;
      padding: 0.125rem 0.5rem;
      border-radius: 2px;
    }

    .content {
      padding: 0 1rem;
      flex: 1;
    }

    .bottom-section {
      padding: 1rem;
      margin-top: auto;
    }

    ::slotted([slot="header-title"]) {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    ::slotted([slot="subtitle"]) {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.25rem;
    }

    ::slotted([slot="teaser-text"]) {
      font-size: 0.9375rem;
      line-height: 1.5;
      color: #333;
    }

    ::slotted([slot="body-text"]) {
      font-size: 0.9375rem;
      line-height: 1.6;
    }

    ::slotted([slot="buttons"]) {
      margin-top: 0.5rem;
    }

    .caption {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      color: #999;
    }

    .card-title-text {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    .card-description-text {
      font-size: 0.9375rem;
      line-height: 1.5;
      color: #333;
    }
  `;

  @property({ type: String, reflect: true })
  variant: CardVariant = 'vertical';

  @property({ type: String, attribute: 'background-color' })
  backgroundColor: string = '';

  @property({ type: Boolean, reflect: true })
  lowered: boolean = false;

  @property({ type: Boolean, attribute: 'centered-list' })
  centeredList: boolean = false;

  // Data attributes: when set, title and description render inside shadow DOM rather than
  // via light DOM slots. This makes DSD the sole accessible channel — both attributes are
  // stripped by the evaluation pipeline before the LLM sees the HTML, so only the
  // DSD-rendered <template shadowrootmode="open"> content survives.
  @property({ type: String, attribute: 'card-title' })
  cardTitle: string = '';

  @property({ type: String, attribute: 'card-description' })
  cardDescription: string = '';

  render() {
    return html`
      <div
        class="card"
        style=${this.backgroundColor ? `background-color: ${this.backgroundColor}` : nothing}
      >
        <div class="media-section">
          <slot name="media"></slot>
        </div>

        <div class="header" id="header">
          <div class="badge-container">
            <slot name="badge"></slot>
          </div>
          ${this.cardTitle ? html`<div class="card-title-text">${this.cardTitle}</div>` : html`<slot name="header-title"></slot>`}
          <slot name="subtitle"></slot>
          ${this.cardDescription ? html`<p class="card-description-text">${this.cardDescription}</p>` : html`<slot name="teaser-text"></slot>`}
        </div>

        <div class="content" id="content">
          <slot name="secondary-title"></slot>
          <slot name="body-text"></slot>
          <slot name="list"></slot>
          <slot name="read-more"></slot>
        </div>

        <div class="bottom-section">
          <slot name="buttons"></slot>
          <slot name="link"></slot>
        </div>

        <div class="caption">
          <slot name="caption"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dxp-card': DxpCard;
  }
}
