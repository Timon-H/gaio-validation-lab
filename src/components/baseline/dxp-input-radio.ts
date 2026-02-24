/**
 * Simulated DXP Input Radio Component
 * 
 * Mirrors the real dxp-input-radio from the DXP design system.
 * Original: Extends DxpHTMLInputElement, manual Shadow DOM with template cloning.
 * 
 * Features replicated:
 * - Custom element 'dxp-input-radio' registration
 * - Options passed as JSON attribute
 * - Label direction: left | right
 * - Name attribute for form grouping
 * - Default value and v-model support via value property
 * - Required/mandatory validation
 * - Validate trigger attribute
 * - Error state management
 * - Custom event dispatching with selected value details
 * - Form label integration
 */
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface RadioOption {
  value: string;
  label: string;
}

@customElement('dxp-input-radio')
export class DxpInputRadio extends LitElement {

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1rem;
    }

    .radio-group-label {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--dxp-radio-label-color, #333);
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    :host([label-direction="left"]) .radio-column {
      flex-direction: row-reverse;
      justify-content: flex-end;
    }

    .radio-column {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    input[type="radio"] {
      width: 1.125rem;
      height: 1.125rem;
      accent-color: var(--dxp-radio-accent, #0066cc);
      cursor: pointer;
      margin: 0;
    }

    label {
      cursor: pointer;
      font-size: 1rem;
      color: var(--dxp-radio-text-color, #333);
      user-select: none;
    }

    :host([error]) .radio-group {
      border-left: 3px solid var(--dxp-radio-error-color, #d32f2f);
      padding-left: 0.75rem;
    }

    .error-message {
      font-size: 0.75rem;
      color: var(--dxp-radio-error-color, #d32f2f);
      margin-top: 0.375rem;
    }

    input[type="radio"]:focus-visible {
      outline: 2px solid var(--dxp-focus-color, #0066cc);
      outline-offset: 2px;
    }
  `;

  @property({ type: String, attribute: 'options' })
  options: string = '{}';

  @property({ type: String, attribute: 'name' })
  name: string = '';

  @property({ type: String, attribute: 'label' })
  label: string = '';

  @property({ type: String, reflect: true })
  value: string = '';

  @property({ type: String, attribute: 'default' })
  default: string = '';

  @property({ type: String, attribute: 'label-direction', reflect: true })
  labelDirection: 'left' | 'right' = 'right';

  @property({ type: Boolean, attribute: 'required' })
  required: boolean = false;

  @property({ type: Boolean, attribute: 'mandatory' })
  mandatory: boolean = false;

  @property({ type: Boolean, attribute: 'validate' })
  validate: boolean = false;

  @property({ type: String, attribute: 'required-error-text' })
  requiredErrorText: string = 'Bitte wählen Sie eine Option.';

  @property({ type: Boolean, attribute: 'error', reflect: true })
  private _error: boolean = false;

  private get _isRequired(): boolean {
    return this.required || this.mandatory;
  }

  private _getOptions(): RadioOption[] {
    try {
      const parsed = JSON.parse(this.options);
      if (Array.isArray(parsed)) return parsed;
      return Object.values(parsed) as RadioOption[];
    } catch {
      return [];
    }
  }

  firstUpdated() {
    if (!this.value && this.default) {
      this.value = this.default;
    }
  }

  private _handleChange(option: RadioOption) {
    this.value = option.value;
    this._error = false;

    this.dispatchEvent(new CustomEvent('@InputRadio/change', {
      detail: {
        inputType: 'radio',
        key: this.name,
        value: option.value,
        validity: true,
      },
      bubbles: true,
      composed: true,
    }));
  }

  private _checkError() {
    if (this.validate && this._isRequired && !this.value) {
      this._error = true;
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('validate') && this.validate) {
      this._checkError();
    }
  }

  render() {
    const options = this._getOptions();

    return html`
      ${this.label ? html`<div class="radio-group-label">${this.label}</div>` : nothing}
      <div class="radio-group" role="radiogroup" aria-label=${this.label || this.name}>
        ${options.map(option => html`
          <div class="radio-column">
            ${this.labelDirection === 'left' ? html`
              <label for="radio_${option.value}">${option.label}</label>
              <input
                type="radio"
                id="radio_${option.value}"
                name=${this.name}
                .value=${option.value}
                ?checked=${this.value === option.value}
                ?required=${this._isRequired}
                @change=${() => this._handleChange(option)}
              />
            ` : html`
              <input
                type="radio"
                id="radio_${option.value}"
                name=${this.name}
                .value=${option.value}
                ?checked=${this.value === option.value}
                ?required=${this._isRequired}
                @change=${() => this._handleChange(option)}
              />
              <label for="radio_${option.value}">${option.label}</label>
            `}
          </div>
        `)}
      </div>
      ${this._error ? html`<div class="error-message">${this.requiredErrorText}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dxp-input-radio': DxpInputRadio;
  }
}
