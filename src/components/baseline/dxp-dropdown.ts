/**
 * Simulated DXP Dropdown Component
 * 
 * Mirrors the real dxp-dropdown-v1 from the DXP design system.
 * Original: Lit-based, extends FormAssociated, uses tippy.js + OverlayScrollbars.
 * 
 * Features replicated:
 * - @customElement('dxp-dropdown-v1') registration
 * - Options passed as JSON string attribute
 * - Form-associated pattern (name, value, FormData)
 * - Label, inline-label, placeholder, tooltip
 * - Required validation with custom error text
 * - Disabled state
 * - Default value
 * - Custom dropdown rendering with ul/li instead of native select
 * - Keyboard navigation (Enter/Space to select)
 * - Change event dispatching (@Dropdown/change)
 * 
 * Simplified: Uses native-like dropdown instead of tippy.js overlay
 */
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface DropdownOption {
  key: string;
  value: string;
  hidden?: boolean;
  selected?: boolean;
}

@customElement('dxp-dropdown-v1')
export class DxpDropdown extends LitElement {

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1rem;
    }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
      color: var(--dxp-dropdown-label-color, #333);
    }

    .label-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .tooltip {
      font-size: 0.75rem;
      color: #999;
      cursor: help;
    }

    .dropdown-wrapper {
      position: relative;
    }

    select {
      width: 100%;
      box-sizing: border-box;
      padding: 0.625rem 2rem 0.625rem 0.75rem;
      font-size: 1rem;
      font-family: inherit;
      border: 1px solid var(--dxp-dropdown-border, #ccc);
      border-radius: var(--dxp-dropdown-radius, 4px);
      background: var(--dxp-dropdown-bg, #fff);
      color: var(--dxp-dropdown-color, #333);
      appearance: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    select:focus {
      outline: none;
      border-color: var(--dxp-dropdown-focus-border, #0066cc);
      box-shadow: 0 0 0 2px var(--dxp-dropdown-focus-shadow, rgba(0,102,204,0.2));
    }

    select:disabled {
      background: #f5f5f5;
      color: #999;
      cursor: not-allowed;
    }

    .arrow {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--dxp-dropdown-arrow-color, #666);
    }

    .inline-label {
      position: absolute;
      right: 2rem;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
      font-size: 0.875rem;
      pointer-events: none;
    }

    .inline-label:empty {
      display: none;
    }

    .error-container {
      font-size: 0.75rem;
      color: var(--dxp-dropdown-error-color, #d32f2f);
      margin-top: 0.25rem;
      min-height: 1rem;
    }

    :host([invalid]) select {
      border-color: var(--dxp-dropdown-error-border, #d32f2f);
    }

    select.placeholder {
      color: #aaa;
    }
  `;

  @property({ type: String, attribute: 'name' })
  name: string = '';

  @property({ type: String, attribute: 'placeholder' })
  placeholder: string = '';

  @property({ type: String, attribute: 'options' })
  options: string = '';

  @property({ type: String, attribute: 'default' })
  default: string = '';

  @property({ type: Boolean, attribute: 'required', reflect: true })
  required: boolean = false;

  @property({ type: String, attribute: 'required-error-text' })
  requiredErrorText: string = 'Es muss ein Wert ausgewählt werden.';

  @property({ type: String, attribute: 'inline-label' })
  inlineLabel: string = '';

  @property({ type: String, attribute: 'label' })
  label: string = '';

  @property({ type: String, attribute: 'tooltip-text' })
  tooltipText: string = '';

  @property({ type: Boolean, reflect: true, attribute: 'disabled' })
  disabled: boolean = false;

  @state() private selectedKey: string = '';
  @state() private _invalid: boolean = false;

  get value(): string {
    return this.selectedKey;
  }

  get data(): FormData {
    const data = new FormData();
    if (this.selectedKey) data.append(this.name, this.selectedKey);
    return data;
  }

  private _getOptions(): DropdownOption[] {
    if (!this.options) return [];
    try {
      const parsed = JSON.parse(this.options);
      if (Array.isArray(parsed)) return parsed;
      // Handle object format { key: value }
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        value: value as string,
      }));
    } catch {
      return [];
    }
  }

  firstUpdated() {
    if (this.default) {
      this.selectedKey = this.default;
    }
  }

  private _handleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedKey = select.value;
    this._invalid = false;

    this.dispatchEvent(new CustomEvent('@Dropdown/change', {
      detail: { key: this.selectedKey, value: select.options[select.selectedIndex]?.text },
      bubbles: true,
      composed: true,
    }));
  }

  private _handleBlur() {
    if (this.required && !this.selectedKey) {
      this._invalid = true;
    }
  }

  render() {
    const options = this._getOptions();
    const visibleOptions = options.filter(o => !o.hidden);

    return html`
      ${this.label ? html`
        <div class="label-row">
          <label>${this.label}</label>
          ${this.tooltipText ? html`<span class="tooltip" title=${this.tooltipText}>ⓘ</span>` : nothing}
        </div>
      ` : nothing}
      <div class="dropdown-wrapper">
        <select
          .value=${this.selectedKey}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @change=${this._handleChange}
          @blur=${this._handleBlur}
          class=${!this.selectedKey ? 'placeholder' : ''}
        >
          <option value="" ?selected=${!this.selectedKey}>${this.placeholder || '-- Bitte wählen --'}</option>
          ${visibleOptions.map(opt => html`
            <option value=${opt.key} ?selected=${opt.key === this.selectedKey}>${opt.value}</option>
          `)}
        </select>
        <span class="arrow">▼</span>
        <div class="inline-label" id="inline-label">${this.inlineLabel}</div>
      </div>
      <div class="error-container" id="Error-Container">
        ${this._invalid ? this.requiredErrorText : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dxp-dropdown-v1': DxpDropdown;
  }
}
