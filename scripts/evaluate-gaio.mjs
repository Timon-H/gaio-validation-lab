#!/usr/bin/env node

import fs from 'fs';
import { OpenAI } from 'openai';

// Configuration
const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = 'http://localhost:4321';
const REPETITIONS = 1; // n=5 for statistical significance
const OUTPUT_FILE = './results/gaio_evaluation_results.csv';

const VARIANTS = [
  { id: 'control', path: '/control' },
  { id: 'jsonld', path: '/test-jsonld-only' },
  { id: 'semantic', path: '/test-semantic-only' },
  { id: 'aria', path: '/test-aria-only' },
  { id: 'noscript', path: '/test-noscript-only' },
  { id: 'dsd', path: '/test-dsd' },
  { id: 'microdata', path: '/test-microdata-only' },
  { id: 'combined', path: '/combined' }
];

const openai = new OpenAI({ apiKey: API_KEY });

// System prompt forces the LLM to extract specific data from the HTML, ensuring consistency across runs and variants.
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
  "links": [ { "text": "...", "href": "..." } ],Is
}
Wenn du keine Daten findest, gib leere Arrays zurück.
`;

async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  return await response.text();
}

async function evaluateVariant(variant, runIndex) {
  const url = `${BASE_URL}${variant.path}`;
  console.log(`⏳ Testing variant ${variant.id} (Run ${runIndex}/${REPETITIONS})...`);

  try {
    const htmlContent = await fetchHtml(url);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Smaller model for cost-effective evaluation; switch to "gpt-4" for more accuracy if budget allows
      temperature: 0.0, // Deterministic output for consistent evaluation
      seed: 42,         // Fixed seed for reproducibility (if supported by the model)
      response_format: { type: "json_object" }, // Force JSON output for easier parsing
      messages: [
        { role: "system", "content": SYSTEM_PROMPT },
        { role: "user", "content": htmlContent }
      ]
    });

    const resultJson = completion.choices[0].message.content;
    const parsedData = JSON.parse(resultJson);
    const extractedCount = parsedData.tarife ? parsedData.tarife.length : 0;

    return {
      variantId: variant.id,
      run: runIndex,
      extractedTariffs: extractedCount,
      rawOutput: JSON.stringify(parsedData).replace(/"/g, '""')
    };
  } catch (error) {
    console.error(`❌ Error in variant ${variant.id}:`, error.message);
    return { variantId: variant.id, run: runIndex, extractedTariffs: 'ERROR', rawOutput: error.message };
  }
}

async function runEvaluation() {
  if (!API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY is not set.");
    return;
  }

  console.log("🚀 Starting GAIO evaluation pipeline...");
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

  const csvHeader = "Variant_ID,Run,Extracted_Count,Raw_JSON_Output\n";
  const csvRows = results.map(r => `${r.variantId},${r.run},${r.extractedTariffs},"${r.rawOutput}"`).join('\n');
  
  fs.writeFileSync(OUTPUT_FILE, csvHeader + csvRows);
  console.log(`\n✅ Evaluation complete! Results saved to: ${OUTPUT_FILE}`);
}

runEvaluation();