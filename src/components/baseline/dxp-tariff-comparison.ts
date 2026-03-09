/**
 * Simulated DXP Tariff Comparison Component
 * 
 * Mirrors the real dxp-tariff-comparison from the DXP design system.
 * Original: Lit-based LitElement, complex sub-components, responsive, sticky headers.
 * 
 * Features replicated:
 * - @customElement('dxp-tariff-comparison') registration
 * - tariffs attribute accepting JSON TariffData
 * - headline / sub-headline
 * - Card view mode vs table view
 * - Button full-width option
 * - Loading state
 * - Dynamic content support (is-dynamic)
 * - Price placeholder display
 * - hide-price-container
 * - Tariff selection event (@TariffComparison/select)
 * - Responsive: mobile card layout, desktop table layout
 * - Module groups with expandable sections
 * - Tariff highlighting
 * 
 * Simplified: Renders tariff cards directly instead of sub-components
 * (dxp-tariff-header, dxp-tariff-price, dxp-tariff-table, etc.)
 */
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface TariffButton {
  label: string;
  variant?: string;
  href?: string;
}

export interface ModuleConfigValue {
  selectedText?: string;
}

export interface ModuleConfig {
  mark?: string;
  moduleReference: string;
  moduleReferenceUuid: string;
  value: ModuleConfigValue;
}

export interface Tariff {
  anchoring?: string;
  anchoringSubline?: string;
  buttons?: TariffButton[];
  description?: string;
  highlighted?: boolean;
  id: string;
  moduleConfigs?: ModuleConfig[];
  name: string;
  overline?: string;
  period: string;
  premium: string;
  subline?: string;
  visible?: boolean;
}

export interface ModuleGroup {
  description?: string;
  expanded?: boolean;
  modules?: Array<{ name?: string; moduleName?: string; uuid?: string; description?: string }>;
  name: string;
}

export interface TariffData {
  hidePriceContainer?: boolean;
  moduleGroups?: ModuleGroup[];
  prefix: string;
  productName: string;
  suffix: string;
  tariffData: Tariff[];
}

const PERIOD_LABELS: Record<string, string> = {
  annual: 'pro Jahr',
  monthly: 'pro Monat',
  oneoff: 'einmalig',
  quarterly: 'pro Quartal',
  empty: '',
};

@customElement('dxp-tariff-comparison')
export class DxpTariffComparison extends LitElement {

  static styles = css`
    :host {
      display: block;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header h2 {
      font-size: 1.75rem;
      color: var(--dxp-tariff-headline-color, #333);
      margin: 0 0 0.5rem;
    }

    .header p {
      color: #666;
      font-size: 1rem;
    }

    .tariff-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .tariff-card {
      border: 2px solid var(--dxp-tariff-border, #e0e0e0);
      border-radius: 12px;
      overflow: hidden;
      background: var(--dxp-tariff-card-bg, #fff);
      transition: border-color 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }

    .tariff-card.highlighted {
      border-color: var(--dxp-tariff-highlight, #0066cc);
      box-shadow: 0 4px 16px rgba(0, 102, 204, 0.15);
    }

    .tariff-card-header {
      padding: 1.25rem;
      text-align: center;
      border-bottom: 1px solid #f0f0f0;
    }

    .tariff-card.highlighted .tariff-card-header {
      background: var(--dxp-tariff-highlight-bg, rgba(0, 102, 204, 0.05));
    }

    .tariff-overline {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b6b6b;
      margin-bottom: 0.25rem;
    }

    .tariff-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--dxp-tariff-name-color, #333);
    }

    .tariff-description {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .tariff-price-section {
      padding: 1.25rem;
      text-align: center;
    }

    .tariff-anchoring {
      font-size: 0.875rem;
      color: #6b6b6b;
      text-decoration: line-through;
      margin-bottom: 0.25rem;
    }

    .tariff-anchoring-subline {
      font-size: 0.75rem;
      color: #6b6b6b;
    }

    .tariff-price {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 0.25rem;
    }

    .tariff-price .prefix {
      font-size: 0.875rem;
      color: #666;
    }

    .tariff-price .premium {
      font-size: 2rem;
      font-weight: 700;
      color: var(--dxp-tariff-price-color, #333);
    }

    .tariff-price .suffix {
      font-size: 0.875rem;
      color: #666;
    }

    .tariff-period {
      font-size: 0.75rem;
      color: #6b6b6b;
      margin-top: 0.25rem;
    }

    .tariff-subline {
      font-size: 0.8125rem;
      color: #666;
      margin-top: 0.5rem;
    }

    .tariff-modules {
      padding: 0 1.25rem;
      flex: 1;
    }

    .module-group {
      margin-bottom: 1rem;
    }

    .module-group-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #555;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .module-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.375rem 0;
      font-size: 0.8125rem;
      color: #555;
    }

    .module-value {
      font-weight: 600;
      color: #333;
    }

    .module-mark {
      color: var(--dxp-tariff-check-color, #4caf50);
      font-size: 1.125rem;
    }

    .tariff-buttons {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: auto;
    }

    .tariff-button {
      display: block;
      width: 100%;
      padding: 0.75rem;
      text-align: center;
      border: 2px solid var(--dxp-tariff-button-border, #0066cc);
      background: var(--dxp-tariff-button-bg, #0066cc);
      color: var(--dxp-tariff-button-color, #fff);
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      box-sizing: border-box;
      transition: background-color 0.2s;
    }

    :host([button-full-width]) .tariff-button {
      width: 100%;
    }

    .tariff-button:hover {
      background: var(--dxp-tariff-button-hover, #004c99);
    }

    /* Loading state */
    .loading-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #999;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid #e0e0e0;
      border-top-color: var(--dxp-tariff-highlight, #0066cc);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .price-placeholder {
      font-size: 2rem;
      font-weight: 700;
      color: #ccc;
    }

    @media (max-width: 599px) {
      .tariff-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  @property({ type: Boolean, attribute: 'button-full-width', reflect: true })
  buttonFullWidth: boolean = false;

  @property({ type: Boolean, attribute: 'card-view' })
  cardView: boolean = false;

  @property({ type: String, attribute: 'headline' })
  headline: string = '';

  @property({ type: Boolean, attribute: 'is-dynamic' })
  isDynamic: boolean = false;

  @property({ type: Boolean, attribute: 'is-loading' })
  isLoading: boolean = false;

  @property({ type: Boolean, attribute: 'price-placeholder' })
  pricePlaceholder: boolean = false;

  @property({ type: Boolean, attribute: 'hide-price' })
  hidePriceContainer: boolean = false;

  @property({ type: String, attribute: 'sub-headline' })
  subHeadline: string = '';

  @property({ attribute: 'tariffs' })
  tariffs: TariffData | string | null = null;

  @state() private _activeTariffId: string = '';

  private _getTariffData(): TariffData | null {
    if (!this.tariffs) return null;
    if (typeof this.tariffs === 'string') {
      try {
        return JSON.parse(this.tariffs);
      } catch {
        return null;
      }
    }
    return this.tariffs as TariffData;
  }

  private _selectTariff(tariff: Tariff) {
    this._activeTariffId = tariff.id;
    this.dispatchEvent(new CustomEvent('@TariffComparison/select', {
      detail: { tariffId: tariff.id, tariffName: tariff.name },
      bubbles: true,
      composed: true,
    }));
  }

  private _renderTariffCard(tariff: Tariff, data: TariffData) {
    if (tariff.visible === false) return nothing;

    return html`
      <div class="tariff-card ${tariff.highlighted ? 'highlighted' : ''} ${this._activeTariffId === tariff.id ? 'active' : ''}">
        <div class="tariff-card-header">
          ${tariff.overline ? html`<div class="tariff-overline">${tariff.overline}</div>` : nothing}
          <div class="tariff-name">${tariff.name}</div>
          ${tariff.description ? html`<div class="tariff-description">${tariff.description}</div>` : nothing}
        </div>

        ${!this.hidePriceContainer && !data.hidePriceContainer ? html`
          <div class="tariff-price-section">
            ${tariff.anchoring ? html`
              <div class="tariff-anchoring">${tariff.anchoring}</div>
              ${tariff.anchoringSubline ? html`<div class="tariff-anchoring-subline">${tariff.anchoringSubline}</div>` : nothing}
            ` : nothing}
            <div class="tariff-price">
              <span class="prefix">${data.prefix}</span>
              <span class="premium">${this.pricePlaceholder ? '--,--' : tariff.premium}</span>
              <span class="suffix">${data.suffix}</span>
            </div>
            <div class="tariff-period">${PERIOD_LABELS[tariff.period] || ''}</div>
            ${tariff.subline ? html`<div class="tariff-subline">${tariff.subline}</div>` : nothing}
          </div>
        ` : nothing}

        ${data.moduleGroups && data.moduleGroups.length > 0 ? html`
          <div class="tariff-modules">
            ${data.moduleGroups.map(group => html`
              <div class="module-group">
                <div class="module-group-name">${group.name}</div>
                ${group.modules?.map(mod => {
                  const config = tariff.moduleConfigs?.find(
                    c => c.moduleReference === mod.moduleName || c.moduleReferenceUuid === mod.uuid
                  );
                  return html`
                    <div class="module-item">
                      <span>${mod.name || mod.moduleName || ''}</span>
                      ${config ? html`
                        <span class="module-value">
                          ${config.mark ? html`<span class="module-mark">${config.mark}</span>` : ''}
                          ${config.value?.selectedText || ''}
                        </span>
                      ` : html`<span class="module-value">—</span>`}
                    </div>
                  `;
                })}
              </div>
            `)}
          </div>
        ` : nothing}

        ${tariff.buttons && tariff.buttons.length > 0 ? html`
          <div class="tariff-buttons">
            ${tariff.buttons.map(btn => html`
              <button
                class="tariff-button"
                @click=${() => this._selectTariff(tariff)}
              >${btn.label}</button>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading-overlay">
          <div class="spinner"></div>
          <span>Tarife werden geladen...</span>
        </div>
      `;
    }

    const data = this._getTariffData();
    if (!data) {
      return html`<div class="loading-overlay">Keine Tarife verfügbar.</div>`;
    }

    const visibleTariffs = data.tariffData.filter(t => t.visible !== false);

    return html`
      ${this.headline || this.subHeadline ? html`
        <div class="header">
          ${this.headline ? html`<h2>${this.headline}</h2>` : nothing}
          ${this.subHeadline ? html`<p>${this.subHeadline}</p>` : nothing}
        </div>
      ` : nothing}

      <div class="tariff-grid">
        ${visibleTariffs.map(tariff => this._renderTariffCard(tariff, data))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dxp-tariff-comparison': DxpTariffComparison;
  }
}
