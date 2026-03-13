import { LitElement, css, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';

export const formBaseStyles = css`
  :host {
    display: block;
    margin-bottom: 1rem;
  }

  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.375rem;
    color: var(--dxp-form-label-color, #333);
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

  .error-message {
    font-size: 0.75rem;
    color: var(--dxp-form-error-color, #d32f2f);
    margin-top: 0.25rem;
  }
`;

export abstract class DxpFormBase extends LitElement {
  @property({ type: String, attribute: 'name' })
  name: string = '';

  @property({ type: String, attribute: 'label' })
  label: string = '';

  @property({ type: String, attribute: 'default' })
  default: string = '';

  @property({ type: Boolean, attribute: 'required', reflect: true })
  required: boolean = false;

  @property({ type: String, attribute: 'required-error-text' })
  requiredErrorText: string = '';

  firstUpdated() {
    const self = this as any;
    if (this.default && (!self.value || self.value === '')) {
      self.value = this.default;
    }
  }

  protected _dispatchEvent<TDetail>(name: string, detail: TDetail): void {
    this.dispatchEvent(new CustomEvent<TDetail>(name, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  protected renderLabel(forId: string, tooltipText: string = '') {
    if (!this.label) {
      return nothing;
    }

    return html`
      <div class="label-row">
        <label for=${forId}>${this.label}</label>
        ${tooltipText ? html`<span class="tooltip" title=${tooltipText}>ⓘ</span>` : nothing}
      </div>
    `;
  }
}
