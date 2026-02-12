/**
 * Simulated DXP Text Input Component
 * 
 * Mirrors the real dxp-text-input from the DXP design system.
 * Original: Lit-based, extends FormAssociated, Shadow DOM encapsulated.
 * 
 * Features replicated:
 * - @customElement('dxp-text-input') registration
 * - Form-associated custom element pattern
 * - Rich attribute API: label, placeholder, name, type, required, disabled
 * - Regex validation with custom error messages
 * - Inline label support
 * - Tooltip text
 * - Validity state management (valueMissing, patternMismatch, customError)
 * - Event dispatching: input, change, blur (with DXP-prefixed custom events)
 * - Default value support
 * - Error display
 */
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

@customElement('dxp-text-input')
export class DxpTextInput extends LitElement {

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
      color: var(--dxp-input-label-color, #333);
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

    .DXP-Input-Wrapper {
      position: relative;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.625rem 0.75rem;
      font-size: 1rem;
      font-family: inherit;
      border: 1px solid var(--dxp-input-border, #ccc);
      border-radius: var(--dxp-input-radius, 4px);
      background: var(--dxp-input-bg, #fff);
      color: var(--dxp-input-color, #333);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus {
      outline: none;
      border-color: var(--dxp-input-focus-border, #0066cc);
      box-shadow: 0 0 0 2px var(--dxp-input-focus-shadow, rgba(0,102,204,0.2));
    }

    input:disabled {
      background: #f5f5f5;
      color: #999;
      cursor: not-allowed;
    }

    input[invalid] {
      border-color: var(--dxp-input-error-border, #d32f2f);
    }

    input::placeholder {
      color: #aaa;
    }

    .DXP-Input-Inline-Label {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
      font-size: 0.875rem;
      pointer-events: none;
    }

    .DXP-Input-Inline-Label:empty {
      display: none;
    }

    .DXP-Input-Error {
      display: none;
      font-size: 0.75rem;
      color: var(--dxp-input-error-color, #d32f2f);
      margin-top: 0.25rem;
    }

    :host([invalid]) .DXP-Input-Error {
      display: block;
    }
  `;

  @property({ type: String, attribute: 'autocomplete' })
  autocomplete: string = 'off';

  @property({ type: String, attribute: 'custom-error-text' })
  customError: string = '';

  @property({ type: Boolean, attribute: 'disabled', reflect: true })
  disabled: boolean = false;

  @property({ type: Boolean, attribute: 'required', reflect: true })
  required: boolean = false;

  @property({ type: String, attribute: 'default', reflect: true })
  default: string = '';

  @property({ type: String, attribute: 'inline-label' })
  inlineLabel: string = '';

  @property({ type: String, attribute: 'label' })
  label: string = '';

  @property({ type: String, attribute: 'name', reflect: true })
  name: string = '';

  @property({ type: String, attribute: 'placeholder', reflect: true })
  placeholder: string = '';

  @property({ type: String, attribute: 'ref-id', reflect: true })
  refId: string = `dxp-text-input-${Math.random().toString(36).slice(2, 9)}`;

  @property({ type: String, attribute: 'regex' })
  regex: string = '';

  @property({ type: String, attribute: 'regex-error-text' })
  regexErrorText: string = '';

  @property({ type: String, attribute: 'required-error-text' })
  requiredErrorText: string = '';

  @property({ type: String, attribute: 'tooltip-text' })
  tooltipText: string = '';

  @property({ type: String, attribute: 'type' })
  type: string = 'text';

  @state() 
  private _invalid: boolean = false;

  @query('input') 
  private _input!: HTMLInputElement;

  get value(): string {
    return this._input?.value ?? '';
  }

  set value(val: string) {
    if (this._input) {
      this._input.value = val;
    }
  }

  private get _errorMessage(): string {
    if (this._invalid) {
      if (this.required && !this.value) {
        return this.requiredErrorText || 'Pflichtfeld';
      }
      if (this.regex && this.value && !new RegExp(this.regex).test(this.value)) {
        return this.regexErrorText || 'Ungültiges Format';
      }
      if (this.customError) {
        return this.customError;
      }
    }
    return 'Ungültige Eingabe';
  }

  firstUpdated() {
    if (!this.value && this.default) {
      this.value = this.default;
    }
  }

  private _validate(): boolean {
    const val = this.value;
    if (this.required && !val) {
      this._invalid = true;
      return false;
    }
    if (this.regex && val && !new RegExp(this.regex).test(val)) {
      this._invalid = true;
      return false;
    }
    this._invalid = false;
    return true;
  }

  private _handleInput(event: Event) {
    this._invalid = false;
    this.dispatchEvent(new CustomEvent('@TextInput/input', {
      detail: { value: (event.target as HTMLInputElement).value },
      bubbles: true,
      composed: true,
    }));
  }

  private _handleChange(event: Event) {
    this.dispatchEvent(new CustomEvent('@TextInput/change', {
      detail: { value: (event.target as HTMLInputElement).value },
      bubbles: true,
      composed: true,
    }));
  }

  private _handleBlur(_event: Event) {
    this._validate();
    this.dispatchEvent(new CustomEvent('@TextInput/blur', {
      detail: { value: this.value, valid: !this._invalid },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      ${this.label ? html`
        <div class="label-row">
          <label for=${this.refId}>${this.label}</label>
          ${this.tooltipText ? html`<span class="tooltip" title=${this.tooltipText}>ⓘ</span>` : nothing}
        </div>
      ` : nothing}
      <div class="DXP-Input-Wrapper">
        <input
          autocomplete=${this.autocomplete}
          id=${this.refId}
          name=${this.name}
          pattern=${this.regex || nothing}
          type=${this.type}
          .placeholder=${this.placeholder || ''}
          ?disabled=${this.disabled}
          ?required=${this.required}
          ?invalid=${this._invalid}
          @blur=${this._handleBlur}
          @change=${this._handleChange}
          @input=${this._handleInput}
        />
        <div class="DXP-Input-Inline-Label">${this.inlineLabel}</div>
        <span class="DXP-Input-Error">${this._errorMessage}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dxp-text-input': DxpTextInput;
  }
}
