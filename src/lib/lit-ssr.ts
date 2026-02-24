/**
 * Lit SSR Helper — renders Lit components to DSD HTML strings
 * 
 * Uses @lit-labs/ssr to server-render Lit components into Declarative Shadow DOM,
 * producing <template shadowrootmode="open"> output that crawlers can parse
 * without JavaScript execution.
 * 
 * Usage (in Astro frontmatter):
 *   import { renderLitToString } from '../../lib/lit-ssr.ts';
 *   import { html } from 'lit';
 *   import '../../components/baseline/dxp-button.ts';
 *   
 *   const buttonHtml = await renderLitToString(
 *     html`<dxp-button variant="secondary">Click me</dxp-button>`
 *   );
 * 
 * Then in template: <Fragment set:html={buttonHtml} />
 */

// Install DOM shim BEFORE any Lit imports — required for SSR in Node
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { render } from '@lit-labs/ssr/lib/render.js';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import type { TemplateResult } from 'lit';

/**
 * Renders a Lit html`` template to a string containing Declarative Shadow DOM.
 * The output includes <template shadowrootmode="open"> with the component's
 * rendered shadow content, plus <!--lit-part--> hydration markers.
 */
export async function renderLitToString(template: TemplateResult): Promise<string> {
  const result = render(template);
  return collectResult(result);
}
