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
const PROVIDER = providerFlagIndex !== -1 ? args[providerFlagIndex + 1] : 'openai';

const SUPPORTED_PROVIDERS = ['openai', 'claude', 'gemini'];
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
    model: 'gpt-4o-mini', // switch to 'gpt-4o' for higher accuracy
  },
  claude: {
    envVar: 'ANTHROPIC_API_KEY',
    model: 'claude-3-5-haiku-20241022', // switch to 'claude-opus-4-5' for higher accuracy
  },
  gemini: {
    envVar: 'GEMINI_API_KEY',
    model: 'gemini-2.0-flash', // switch to 'gemini-2.5-pro' for higher accuracy
  },
};

const config = PROVIDER_CONFIG[PROVIDER];
const API_KEY = process.env[config.envVar];

// ---------------------------------------------------------------------------
// General configuration
// ---------------------------------------------------------------------------
const BASE_URL = 'http://localhost:4321';
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
const OUTPUT_FILE = `./results/gaio_evaluation_${PROVIDER}.csv`;

// ---------------------------------------------------------------------------
// System prompt – shared across providers
// ---------------------------------------------------------------------------
// Forces the LLM to extract specific data from the HTML for consistent,
// comparable results across providers, runs, and variants.
const SYSTEM_PROMPT = `
Du bist ein automatisierter Web-Scraper und Daten-Extraktor.
Deine Aufgabe ist es, das übergebene HTML-Dokument zu analysieren und folgende Informationen zu extrahieren:
1. Alle angebotenen Versicherungstarife (Name und Preis)
2. Alle inhaltlichen Überschriften (h1-h6)
3. Alle Navigations-Links (Text und href)

Antworte im validen JSON-Format, exakt nach folgendem Schema:
{
  "tarife": [ { "name": "...", "preis": "..." } ],
  "headings": [ "..." ],
  "links": [ { "text": "...", "href": "..." } ]
}
Wenn du keine Daten findest, gib leere Arrays zurück.
`.trim();

// ---------------------------------------------------------------------------
// Provider-specific LLM call functions
// ---------------------------------------------------------------------------

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

async function callClaude(htmlContent) {
  const client = new Anthropic({ apiKey: API_KEY });
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 2048,
    temperature: 0.0,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: htmlContent },
    ],
  });
  // Claude returns an array of content blocks; grab the first text block
  const textBlock = message.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : '{}';
}

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
// Core evaluation logic
// ---------------------------------------------------------------------------

async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  return await response.text();
}

async function evaluateVariant(variant, runIndex) {
  const url = `${BASE_URL}${variant.path}`;
  console.log(`⏳ [${PROVIDER}] Testing variant "${variant.id}" (Run ${runIndex}/${REPETITIONS})...`);

  try {
    const htmlContent = await fetchHtml(url);
    const resultJson = await callLLM(htmlContent);
    const parsedData = JSON.parse(resultJson);
    const extractedCount = parsedData.tarife ? parsedData.tarife.length : 0;

    return {
      provider: PROVIDER,
      variantId: variant.id,
      run: runIndex,
      extractedTariffs: extractedCount,
      rawOutput: JSON.stringify(parsedData).replace(/"/g, '""'),
    };
  } catch (error) {
    console.error(`❌ Error in variant "${variant.id}":`, error.message);
    return {
      provider: PROVIDER,
      variantId: variant.id,
      run: runIndex,
      extractedTariffs: 'ERROR',
      rawOutput: error.message.replace(/"/g, '""'),
    };
  }
}

async function runEvaluation() {
  if (!API_KEY) {
    console.error(`❌ Error: ${config.envVar} is not set.`);
    process.exit(1);
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

  const csvHeader = 'Provider,Variant_ID,Run,Extracted_Count,Raw_JSON_Output\n';
  const csvRows = results
    .map(r => `${r.provider},${r.variantId},${r.run},${r.extractedTariffs},"${r.rawOutput}"`)
    .join('\n');

  fs.writeFileSync(OUTPUT_FILE, csvHeader + csvRows);
  console.log(`\n✅ Evaluation complete! Results saved to: ${OUTPUT_FILE}`);
}

runEvaluation();