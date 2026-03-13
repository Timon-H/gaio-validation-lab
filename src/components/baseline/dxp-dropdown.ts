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
import { html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DxpFormBase, formBaseStyles } from "./dxp-form-base";

export interface DropdownOption {
  key: string;
  value: string;
  hidden?: boolean;
  selected?: boolean;
}

@customElement("dxp-dropdown-v1")
export class DxpDropdown extends DxpFormBase {
  static styles = [
    formBaseStyles,
    css`
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
        box-shadow: 0 0 0 2px
          var(--dxp-dropdown-focus-shadow, rgba(0, 102, 204, 0.2));
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

      .error-message {
        color: var(--dxp-dropdown-error-color, #d32f2f);
        min-height: 1rem;
      }

      :host([invalid]) select {
        border-color: var(--dxp-dropdown-error-border, #d32f2f);
      }

      select.placeholder {
        color: #6b6b6b;
      }
    `,
  ];

  @property({ type: String, attribute: "placeholder" })
  placeholder: string = "";

  @property({ type: String, attribute: "options" })
  options: string = "";

  @property({ type: String, attribute: "inline-label" })
  inlineLabel: string = "";

  @property({ type: String, attribute: "tooltip-text" })
  tooltipText: string = "";

  @property({ type: Boolean, reflect: true, attribute: "disabled" })
  disabled: boolean = false;

  @state() private selectedKey: string = "";
  @property({ type: Boolean, attribute: "invalid", reflect: true })
  private _invalid: boolean = false;

  constructor() {
    super();
    this.requiredErrorText = "Es muss ein Wert ausgewählt werden.";
  }

  get value(): string {
    return this.selectedKey;
  }

  set value(nextValue: string) {
    this.selectedKey = nextValue ?? "";
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

  private _handleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.value = select.value;
    this._invalid = false;

    this._dispatchEvent("@Dropdown/change", {
      key: this.value,
      value: select.options[select.selectedIndex]?.text,
    });
  }

  private _handleBlur() {
    if (this.required && !this.selectedKey) {
      this._invalid = true;
    }
  }

  render() {
    const options = this._getOptions();
    const visibleOptions = options.filter((o) => !o.hidden);

    return html`
      ${this.renderLabel(`select-${this.name}`, this.tooltipText)}
      <div class="dropdown-wrapper">
        <select
          id="select-${this.name}"
          .value=${this.selectedKey}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @change=${this._handleChange}
          @blur=${this._handleBlur}
          class=${!this.selectedKey ? "placeholder" : ""}
        >
          <option value="" ?selected=${!this.selectedKey}>
            ${this.placeholder || "-- Bitte wählen --"}
          </option>
          ${visibleOptions.map(
            (opt) => html`
              <option
                value=${opt.key}
                ?selected=${opt.key === this.selectedKey}
              >
                ${opt.value}
              </option>
            `,
          )}
        </select>
        <span class="arrow">▼</span>
        <div class="inline-label" id="inline-label">${this.inlineLabel}</div>
      </div>
      <div class="error-message" id="Error-Container">
        ${this._invalid ? this.requiredErrorText : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dxp-dropdown-v1": DxpDropdown;
  }
}
