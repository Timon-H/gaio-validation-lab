#!/usr/bin/env node

/**
 * GAIO Evaluation Script
 *
 * Supports three LLM providers: openai, claude, gemini, all (runs all three sequentially)
 *
 * Usage:
 *   node evaluate.mjs --provider openai       # OpenAI only
 *   node evaluate.mjs --provider claude       # Claude only
 *   node evaluate.mjs --provider gemini       # Gemini only
 *   node evaluate.mjs --provider all          # All three providers sequentially
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
const repetitionsFlagIndex = args.indexOf('--repetitions');
const REPETITIONS_ARG = repetitionsFlagIndex !== -1 ? parseInt(args[repetitionsFlagIndex + 1], 10) : NaN;
const variantFlagIndex = args.indexOf('--variant');
const VARIANT_FILTER = variantFlagIndex !== -1 ? args[variantFlagIndex + 1] : null;

const SUPPORTED_PROVIDERS = ['openai', 'claude', 'gemini', 'all'];

if (!PROVIDER) {
  console.log(`
Usage: node evaluate.mjs --provider <provider> [options]

Providers:
  openai   → uses OPENAI_API_KEY    (model: gpt-4.1-mini)
  claude   → uses ANTHROPIC_API_KEY  (model: claude-haiku-4-5)
  gemini   → uses GEMINI_API_KEY     (model: gemini-3-flash-preview)
  all      → runs openai, claude, gemini sequentially; all three API keys required

Options:
  --persist               Write results to Supabase in addition to CSV output.
                          Requires SUPABASE_URL and SUPABASE_ANON_KEY.
  --url <base-url>        Override the target base URL (default: http://localhost:4321).
                          Example: --url https://gaio-validation-lab.vercel.app
  --repetitions <n>       Number of runs per variant (default: 1).
  --variant <id>          Run only a single variant (default: all).
                          IDs: control, jsonld, semantic, aria, noscript, dsd, microdata, combined

Npm shortcuts (pass flags after --):
  npm run evaluate:openai -- --persist
  npm run evaluate:claude -- --persist --repetitions 5
  npm run evaluate:gemini -- --url https://gaio-validation-lab.vercel.app
  npm run evaluate:all   -- --persist --repetitions 5
  npm run evaluate:all   -- --url https://gaio-validation-lab.vercel.app --persist
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
    model: 'gpt-4.1-mini', 
    // switch to 'gpt-4.1' for higher accuracy and 'gpt-4.1-nano' for faster but less accurate results
    // NOTE: GPT-5 models are intentionally excluded — at the time of writing
    // they do not support the temperature parameter, which is required for
    // deterministic output.
  },
  claude: {
    envVar: 'ANTHROPIC_API_KEY',
    model: 'claude-haiku-4-5', 
    // switch to 'claude-opus-4-5' for higher accuracy
  },
  gemini: {
    envVar: 'GEMINI_API_KEY',
    model: 'gemini-3-flash-preview', 
    // switch to 'gemini-3-pro-preview' for higher accuracy
  },
};

// ---------------------------------------------------------------------------
// General configuration
// ---------------------------------------------------------------------------
const BASE_URL = URL_OVERRIDE ?? 'http://localhost:4321';
const REPETITIONS = Number.isFinite(REPETITIONS_ARG) && REPETITIONS_ARG > 0 ? REPETITIONS_ARG : 1;

const ALL_VARIANTS = [
  { id: 'control',    path: '/control' },
  { id: 'jsonld',     path: '/test-jsonld' },
  { id: 'semantic',   path: '/test-semantic' },
  { id: 'aria',       path: '/test-aria' },
  { id: 'noscript',   path: '/test-noscript' },
  { id: 'dsd',        path: '/test-dsd' },
  { id: 'microdata',  path: '/test-microdata' },
  { id: 'combined',   path: '/combined' },
];

if (VARIANT_FILTER && !ALL_VARIANTS.some(v => v.id === VARIANT_FILTER)) {
  console.error(`❌ Unknown variant "${VARIANT_FILTER}". Choose from: ${ALL_VARIANTS.map(v => v.id).join(', ')}`);
  process.exit(1);
}

const VARIANTS = VARIANT_FILTER ? ALL_VARIANTS.filter(v => v.id === VARIANT_FILTER) : ALL_VARIANTS;

// Ensure results directory exists
fs.mkdirSync('./results', { recursive: true });

// ---------------------------------------------------------------------------
// System prompt – shared across providers
// ---------------------------------------------------------------------------
// Forces the LLM to extract specific data from the HTML for consistent,
// comparable results across providers, runs, and variants.
//
// Field rationale (tied to AI extractability measurement goals):
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
async function callOpenAI(htmlContent, model, apiKey) {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
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
async function callClaude(htmlContent, model, apiKey) {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
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
async function callGemini(htmlContent, modelName, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
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
async function callLLM(provider, htmlContent, config, apiKey) {
  switch (provider) {
    case 'openai': return callOpenAI(htmlContent, config.model, apiKey);
    case 'claude': return callClaude(htmlContent, config.model, apiKey);
    case 'gemini': return callGemini(htmlContent, config.model, apiKey);
    default: throw new Error(`Unsupported provider: ${provider}`);
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
async function callLLMWithRetry(provider, htmlContent, config, apiKey) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callLLM(provider, htmlContent, config, apiKey);
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
async function evaluateVariant(provider, config, apiKey, variant, runIndex) {
  const url = `${BASE_URL}${variant.path}`;
  console.log(`⏳ [${provider}] Testing variant "${variant.id}" (Run ${runIndex}/${REPETITIONS})...`);

  try {
    const htmlContent = await fetchHtml(url);
    const resultJson = await callLLMWithRetry(provider, htmlContent, config, apiKey);
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
        provider,
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
      provider,
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
      provider,
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

async function runProviderEvaluation(provider, config, apiKey) {
  const outputFile = `./results/gaio_evaluation_${provider}_${new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')}.csv`;
  console.log(`🚀 Starting GAIO evaluation pipeline  [provider: ${provider}, model: ${config.model}]`);
  const results = [];

  // Sequential testing to avoid overwhelming the server and to respect rate limits
  for (const variant of VARIANTS) {
    for (let i = 1; i <= REPETITIONS; i++) {
      const res = await evaluateVariant(provider, config, apiKey, variant, i);
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

  fs.writeFileSync(outputFile, csvHeader + csvRows);
  console.log(`✅ Results saved to: ${outputFile}`);

  if (PERSIST) {
    const persisted = results.filter(r => r.dbStatus === 'OK').length;
    const failed    = results.filter(r => r.dbStatus === 'ERR').length;
    console.log(`💾 Database: ${persisted} persisted / ${failed} failed`);
  }
}

async function runEvaluation() {
  if (PERSIST) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Error: --persist requires SUPABASE_URL and SUPABASE_ANON_KEY to be set.');
      process.exit(1);
    }
    console.log(`💾 Persist mode: results will be written to Supabase (${process.env.SUPABASE_URL})`);
  }

  const providersToRun = PROVIDER === 'all' ? ['openai', 'claude', 'gemini'] : [PROVIDER];

  for (const provider of providersToRun) {
    const config = PROVIDER_CONFIG[provider];
    const apiKey = process.env[config.envVar];

    if (!apiKey) {
      console.error(`❌ Error: ${config.envVar} is not set.`);
      process.exit(1);
    }

    if (PROVIDER === 'all') {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`  Provider: ${provider.toUpperCase()}`);
      console.log(`${'='.repeat(60)}`);
    }

    await runProviderEvaluation(provider, config, apiKey);
  }

  if (PROVIDER === 'all') {
    console.log(`\n${'='.repeat(60)}`);
    console.log('  All-providers run complete');
    console.log(`${'='.repeat(60)}`);
  }

  if (PERSIST) {
    console.log(`\n   Query: SELECT * FROM llm_evaluation_results ORDER BY created_at DESC;`);
  }
}

runEvaluation();