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
 * - Required validation
 * - Validate trigger attribute
 * - Invalid state management
 * - Custom event dispatching with selected value details
 * - Form label integration
 */
import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DxpFormBase, formBaseStyles } from './dxp-form-base';

export interface RadioOption {
  value: string;
  label: string;
}

@customElement('dxp-input-radio')
export class DxpInputRadio extends DxpFormBase {

  static styles = [
    formBaseStyles,
    css`

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

    .radio-column > label {
      cursor: pointer;
      font-size: 1rem;
      color: var(--dxp-radio-text-color, #333);
      user-select: none;
    }

    :host([invalid]) .radio-group {
      border-left: 3px solid var(--dxp-radio-error-color, #d32f2f);
      padding-left: 0.75rem;
    }

    input[type="radio"]:focus-visible {
      outline: 2px solid var(--dxp-focus-color, #0066cc);
      outline-offset: 2px;
    }
    `,
  ];

  @property({ type: String, attribute: 'options' })
  options: string = '{}';

  @property({ type: String, reflect: true })
  value: string = '';

  @property({ type: String, attribute: 'label-direction', reflect: true })
  labelDirection: 'left' | 'right' = 'right';

  @property({ type: Boolean, attribute: 'validate' })
  validate: boolean = false;

  @property({ type: Boolean, attribute: 'invalid', reflect: true })
  private _invalid: boolean = false;

  constructor() {
    super();
    this.requiredErrorText = 'Bitte wählen Sie eine Option.';
  }

  private get _isRequired(): boolean {
    return this.required;
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

  private _handleChange(option: RadioOption) {
    this.value = option.value;
    this._invalid = false;

    this._dispatchEvent('@InputRadio/change', {
      inputType: 'radio',
      key: this.name,
      value: option.value,
      validity: true,
    });
  }

  private _checkError() {
    if (this.validate && this._isRequired && !this.value) {
      this._invalid = true;
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('validate') && this.validate) {
      this._checkError();
    }
  }

  render() {
    const options = this._getOptions();
    const groupId = `${this.name || 'dxp-radio'}-group`;

    return html`
      ${this.renderLabel(groupId)}
      <div class="radio-group" id=${groupId} role="radiogroup" aria-label=${this.label || this.name}>
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
      ${this._invalid ? html`<div class="error-message">${this.requiredErrorText}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dxp-input-radio': DxpInputRadio;
  }
}
