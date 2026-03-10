#!/usr/bin/env node

/**
 * GAIO Evaluation Script
 *
 * Supports three LLM providers: openai (default), claude, gemini
 *
 * Usage:
 *   node evaluate-gaio.mjs                        # uses OpenAI
 *   node evaluate-gaio.mjs --provider claude       # uses Anthropic Claude
 *   node evaluate-gaio.mjs --provider gemini       # uses Google Gemini
 *
 * Required environment variables (per provider):
 *   openai  → OPENAI_API_KEY
 *   claude  → ANTHROPIC_API_KEY
 *   gemini  → GEMINI_API_KEY
 */

import fs from 'fs';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const providerFlagIndex = args.indexOf('--provider');
const PROVIDER = providerFlagIndex !== -1 ? args[providerFlagIndex + 1] : null;
const PERSIST = args.includes('--persist');
const urlFlagIndex = args.indexOf('--url');
const URL_OVERRIDE = urlFlagIndex !== -1 ? args[urlFlagIndex + 1] : null;

const SUPPORTED_PROVIDERS = ['openai', 'claude', 'gemini'];

if (!PROVIDER) {
  console.log(`
Usage: node evaluate-gaio.mjs --provider <provider> [--persist] [--url <base-url>]

Providers:
  openai   → uses OPENAI_API_KEY    (model: gpt-4.1-mini)
  claude   → uses ANTHROPIC_API_KEY  (model: claude-haiku-4-5)
  gemini   → uses GEMINI_API_KEY     (model: gemini-3-flash-preview)

Options:
  --persist          Write results to Supabase in addition to CSV output.
                     Requires SUPABASE_URL and SUPABASE_ANON_KEY.
  --url <base-url>   Override the target base URL (default: http://localhost:4321).
                     Example: --url https://gaio-validation-lab.vercel.app

Npm shortcuts:
  npm run evaluate:openai
  npm run evaluate:claude
  npm run evaluate:gemini
  npm run evaluate:openai:persist
  npm run evaluate:claude:persist
  npm run evaluate:gemini:persist
  npm run evaluate:openai:live
  npm run evaluate:claude:live
  npm run evaluate:gemini:live
  npm run evaluate:openai:live:persist
  npm run evaluate:claude:live:persist
  npm run evaluate:gemini:live:persist
`);
  process.exit(0);
}

if (!SUPPORTED_PROVIDERS.includes(PROVIDER)) {
  console.error(`❌ Unknown provider "${PROVIDER}". Choose from: ${SUPPORTED_PROVIDERS.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------
const PROVIDER_CONFIG = {
  openai: {
    envVar: 'OPENAI_API_KEY',
    model: 'gpt-4.1-mini', // switch to 'gpt-4.1' for higher accuracy
    // NOTE: GPT-5 models are intentionally excluded — they do not support
    // the temperature parameter, which is required for deterministic output.
  },
  claude: {
    envVar: 'ANTHROPIC_API_KEY',
    model: 'claude-haiku-4-5', // switch to 'claude-opus-4-5' for higher accuracy
  },
  gemini: {
    envVar: 'GEMINI_API_KEY',
    model: 'gemini-3-flash-preview', // switch to 'gemini-3-pro-preview' for higher accuracy
  },
};

const config = PROVIDER_CONFIG[PROVIDER];
const API_KEY = process.env[config.envVar];

// ---------------------------------------------------------------------------
// General configuration
// ---------------------------------------------------------------------------
const BASE_URL = URL_OVERRIDE ?? 'http://localhost:4321';
const REPETITIONS = 1; // n=5 for statistical significance

const VARIANTS = [
  { id: 'control',    path: '/control' },
  { id: 'jsonld',     path: '/test-jsonld-only' },
  { id: 'semantic',   path: '/test-semantic-only' },
  { id: 'aria',       path: '/test-aria-only' },
  { id: 'noscript',   path: '/test-noscript-only' },
  { id: 'dsd',        path: '/test-dsd' },
  { id: 'microdata',  path: '/test-microdata-only' },
  { id: 'combined',   path: '/combined' },
];

// Ensure results directory exists
fs.mkdirSync('./results', { recursive: true });
const RUN_TIMESTAMP = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const OUTPUT_FILE = `./results/gaio_evaluation_${PROVIDER}_${RUN_TIMESTAMP}.csv`;

// ---------------------------------------------------------------------------
// System prompt – shared across providers
// ---------------------------------------------------------------------------
// Forces the LLM to extract specific data from the HTML for consistent,
// comparable results across providers, runs, and variants.
//
// Field rationale (tied to GAIObility measurement goals):
//
//  tarife[]           — core KPI; Deckungssumme/Selbstbeteiligung are only
//                       accessible in Shadow DOM → strong variant discriminator
//  tarife.hervorgehoben — "Beliebteste Wahl" flag; tests whether highlights
//                       inside Shadow DOM are visible
//  faq[]              — accordion content lives in Shadow DOM slots;
//                       only visible in DSD / combined → primary discriminator
//  kontakt            — flyout content (phone, hours) is Shadow DOM;
//                       another strong discriminator
//  produktkarten[]    — card slot content; tests Shadow DOM slot visibility
//  formFelder[]       — input labels live in Shadow DOM; tests their
//                       visibility per technique (noscript fallback vs. DSD)
//  anbieter           — provider name; present in JSON-LD and page headings
//  zielgruppe         — inferrable from product names (e.g. "Privat…")
//                       NOTE: 'region' was intentionally omitted — it does
//                       not appear on any page variant.
const SYSTEM_PROMPT = `
Du bist ein präziser Daten-Extraktor. Analysiere das übergebene HTML-Dokument einer Versicherungswebseite.

Deine Aufgabe ist es, die aktuell angebotenen Haupttarife, Kontaktinformationen und Formularfelder aus dem Quelltext zu extrahieren.
Erfasse nur die Haupttarife des primär beworbenen Produkts dieser Seite.
Setze den Wert auf null, wenn eine Information im HTML nicht eindeutig identifizierbar ist oder das Label fehlt.
Gib leere Arrays zurück, wenn keine passenden Einträge gefunden werden.

Antworte ausschließlich mit einem validen JSON-Objekt exakt nach folgendem Schema – ohne Erklärungen oder Markdown:

{
  "anbieter": "...",
  "zielgruppe": "...",
  "tarife": [
    {
      "name": "...",
      "preis": "...",
      "zahlungsperiode": "...",
      "selbstbeteiligung": "...",
      "deckungssumme": "...",
      "hervorgehoben": true
    }
  ],
  "produktkarten": [
    {
      "name": "...",
      "beschreibung": "..."
    }
  ],
  "faq": [
    {
      "frage": "...",
      "antwort": "..."
    }
  ],
  "formFelder": [
    {
      "label": "...",
      "typ": "..."
    }
  ],
  "kontakt": {
    "telefon": "...",
    "oeffnungszeiten": "..."
  }
}
`.trim();

// ---------------------------------------------------------------------------
// Provider-specific LLM call functions
// ---------------------------------------------------------------------------

/**
 * Sends the page HTML to OpenAI and returns the raw JSON string response.
 * Uses `response_format: json_object` to guarantee valid JSON output.
 * @param {string} htmlContent - Raw HTML of the page variant to evaluate.
 * @returns {Promise<string>} JSON string extracted by the model.
 */
async function callOpenAI(htmlContent) {
  const client = new OpenAI({ apiKey: API_KEY });
  const completion = await client.chat.completions.create({
    model: config.model,
    temperature: 0.0,  // Deterministic output for consistent evaluation
    seed: 42,          // Fixed seed for reproducibility (if supported by the model)
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: htmlContent },
    ],
  });
  return completion.choices[0].message.content;
}

/**
 * Sends the page HTML to Anthropic Claude and returns the raw JSON string response.
 * Uses assistant prefilling (starting with `{`) to force JSON-only output.
 * @param {string} htmlContent - Raw HTML of the page variant to evaluate.
 * @returns {Promise<string>} JSON string extracted by the model.
 */
async function callClaude(htmlContent) {
  const client = new Anthropic({ apiKey: API_KEY });
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 2048,
    temperature: 0.0,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user',      content: htmlContent },
      // Prefilling: seeding the assistant turn with '{' forces Claude to continue
      // writing valid JSON rather than adding conversational text before the object.
      // The opening brace must be prepended to the response when parsing.
      { role: 'assistant', content: '{' },
    ],
  });
  // Claude returns an array of content blocks; grab the first text block
  const textBlock = message.content.find(b => b.type === 'text');
  // Re-attach the prefilled '{' that Claude was forced to continue from
  return '{' + (textBlock ? textBlock.text : '}');
}

/**
 * Sends the page HTML to Google Gemini and returns the raw JSON string response.
 * Uses `responseMimeType: application/json` to guarantee valid JSON output.
 * @param {string} htmlContent - Raw HTML of the page variant to evaluate.
 * @returns {Promise<string>} JSON string extracted by the model.
 */
async function callGemini(htmlContent) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      temperature: 0.0,
      responseMimeType: 'application/json',
    },
    systemInstruction: SYSTEM_PROMPT,
  });
  const result = await model.generateContent(htmlContent);
  return result.response.text();
}

/**
 * Dispatches an LLM call to the configured provider.
 * @param {string} htmlContent - Raw HTML of the page variant to evaluate.
 * @returns {Promise<string>} JSON string extracted by the model.
 */
// Dispatch to the correct provider
async function callLLM(htmlContent) {
  switch (PROVIDER) {
    case 'openai': return callOpenAI(htmlContent);
    case 'claude': return callClaude(htmlContent);
    case 'gemini': return callGemini(htmlContent);
    default: throw new Error(`Unsupported provider: ${PROVIDER}`);
  }
}

// ---------------------------------------------------------------------------
// Retry wrapper — handles 429 rate-limit responses from any provider.
// Parses the retryDelay the API suggests (e.g. Gemini's "retryDelay":"52s")
// and waits that long before retrying. Falls back to exponential backoff.
// ---------------------------------------------------------------------------
const MAX_RETRIES = 3;

function parseRetryDelayMs(errorMessage) {
  // Gemini embeds retryDelay in the error JSON, e.g. "retryDelay":"52s"
  const match = errorMessage.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 2000; // +2s buffer
  return null;
}

/**
 * Wraps `callLLM` with retry logic for 429 rate-limit errors.
 * Parses the provider-suggested retry delay from the error message and waits
 * accordingly, falling back to linear backoff (15s, 30s, 45s).
 * @param {string} htmlContent - Raw HTML of the page variant to evaluate.
 * @returns {Promise<string>} JSON string extracted by the model.
 */
async function callLLMWithRetry(htmlContent) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callLLM(htmlContent);
    } catch (err) {
      lastError = err;
      const msg = err.message ?? '';
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota');

      if (!is429 || attempt === MAX_RETRIES) throw err;

      const suggestedMs = parseRetryDelayMs(msg);
      const waitMs = suggestedMs ?? (attempt * 15_000); // fallback: 15s, 30s, 45s
      const waitSec = Math.round(waitMs / 1000);
      console.warn(`  ⏸  Rate limited (attempt ${attempt}/${MAX_RETRIES}). Waiting ${waitSec}s before retry...`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Supabase persistence
// ---------------------------------------------------------------------------

/**
 * Persists a single evaluation result row to the Supabase `llm_evaluation_results` table.
 * @param {object} payload - Row data matching the table schema.
 * @returns {Promise<boolean>} `true` if the insert succeeded, `false` otherwise.
 */
async function persistEvalResult(payload) {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/llm_evaluation_results`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) return true;

    const text = await response.text().catch(() => '(no body)');
    console.error('Persist failed:', response.status, text);
    return false;
  } catch (err) {
    console.error('Persist exception:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core evaluation logic
// ---------------------------------------------------------------------------

/**
 * Fetches the HTML of a page variant, stripping HTML comments to reduce token usage.
 * @param {string} url - Full URL of the variant to fetch.
 * @returns {Promise<string>} Raw HTML with comments removed.
 */
async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  const raw = await response.text();
  // Strip HTML comments to reduce token usage.
  // Strip <nav>...</nav> to prevent experimental variant names (e.g. "JSON-LD",
  // "Semantic", "ARIA") from leaking into the LLM context — the BaseLayout nav
  // lists all eight variants by name, which would reveal the experimental design
  // and could bias extraction behaviour.
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '');
}

/**
 * Evaluates a single page variant for one run index.
 * Fetches the HTML, calls the LLM, parses the response, and optionally persists the result.
 * @param {{ id: string, path: string }} variant - Variant descriptor.
 * @param {number} runIndex - 1-based repetition index.
 * @returns {Promise<object>} Result row ready for CSV serialisation.
 */
async function evaluateVariant(variant, runIndex) {
  const url = `${BASE_URL}${variant.path}`;
  console.log(`⏳ [${PROVIDER}] Testing variant "${variant.id}" (Run ${runIndex}/${REPETITIONS})...`);

  try {
    const htmlContent = await fetchHtml(url);
    const resultJson = await callLLMWithRetry(htmlContent);
    const parsedData = JSON.parse(resultJson);

    // Count extracted items per dimension for quick comparison across variants
    const counts = {
      tarife:        parsedData.tarife?.length ?? 0,
      faq:           parsedData.faq?.length ?? 0,
      produktkarten: parsedData.produktkarten?.length ?? 0,
      formFelder:    parsedData.formFelder?.length ?? 0,
      hatKontakt:    (parsedData.kontakt?.telefon || parsedData.kontakt?.oeffnungszeiten) ? 1 : 0,
      hatAnbieter:   parsedData.anbieter ? 1 : 0,
    };

    let dbStatus = '-';
    if (PERSIST) {
      const ok = await persistEvalResult({
        provider:            PROVIDER,
        model:               config.model,
        variant_id:          variant.id,
        run:                 runIndex,
        tarife_count:        counts.tarife,
        faq_count:           counts.faq,
        produktkarten_count: counts.produktkarten,
        form_felder_count:   counts.formFelder,
        hat_kontakt:         counts.hatKontakt === 1,
        hat_anbieter:        counts.hatAnbieter === 1,
        raw_output:          parsedData,
      });
      dbStatus = ok ? 'OK' : 'ERR';
    }

    return {
      provider: PROVIDER,
      variantId: variant.id,
      run: runIndex,
      extractedTariffs: counts.tarife,
      extractedFaq: counts.faq,
      extractedKarten: counts.produktkarten,
      extractedFormFelder: counts.formFelder,
      hatKontakt: counts.hatKontakt,
      hatAnbieter: counts.hatAnbieter,
      dbStatus,
      rawOutput: JSON.stringify(parsedData).replace(/"/g, '""'),
    };
  } catch (error) {
    console.error(`❌ Error in variant "${variant.id}":`, error.message);
    return {
      provider: PROVIDER,
      variantId: variant.id,
      run: runIndex,
      extractedTariffs: 'ERROR',
      extractedFaq: 'ERROR',
      extractedKarten: 'ERROR',
      extractedFormFelder: 'ERROR',
      hatKontakt: 'ERROR',
      hatAnbieter: 'ERROR',
      dbStatus: 'ERROR',
      rawOutput: error.message.replace(/"/g, '""'),
    };
  }
}

async function runEvaluation() {
  if (!API_KEY) {
    console.error(`❌ Error: ${config.envVar} is not set.`);
    process.exit(1);
  }

  if (PERSIST) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Error: --persist requires SUPABASE_URL and SUPABASE_ANON_KEY to be set.');
      process.exit(1);
    }
    console.log(`💾 Persist mode: results will be written to Supabase (${process.env.SUPABASE_URL})`);
  }

  console.log(`🚀 Starting GAIO evaluation pipeline  [provider: ${PROVIDER}, model: ${config.model}]`);
  const results = [];

  // Sequential testing to avoid overwhelming the server and to respect rate limits
  for (const variant of VARIANTS) {
    for (let i = 1; i <= REPETITIONS; i++) {
      const res = await evaluateVariant(variant, i);
      results.push(res);
      // Pause between requests to avoid rate limits and give the server time to recover
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const csvHeader = 'Provider,Variant_ID,Run,Tarife,FAQ,Produktkarten,FormFelder,Hat_Kontakt,Hat_Anbieter,DB,Raw_JSON_Output\n';
  const csvRows = results
    .map(r =>
      `${r.provider},${r.variantId},${r.run},${r.extractedTariffs},${r.extractedFaq},${r.extractedKarten},${r.extractedFormFelder},${r.hatKontakt},${r.hatAnbieter},${r.dbStatus},"${r.rawOutput}"`
    )
    .join('\n');

  fs.writeFileSync(OUTPUT_FILE, csvHeader + csvRows);
  console.log(`\n✅ Evaluation complete! Results saved to: ${OUTPUT_FILE}`);

  if (PERSIST) {
    const persisted = results.filter(r => r.dbStatus === 'OK').length;
    const failed    = results.filter(r => r.dbStatus === 'ERR').length;
    console.log(`💾 Database: ${persisted} persisted / ${failed} failed`);
    console.log(`   Query: SELECT * FROM llm_evaluation_results ORDER BY created_at DESC;`);
  }
}

runEvaluation();