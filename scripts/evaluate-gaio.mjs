import fs from 'fs';
import { OpenAI } from 'openai';

// Konfiguration
const API_KEY = process.env.OPENAI_API_KEY; // Stelle sicher, dass diese Umgebungsvariable gesetzt ist (.env)
const BASE_URL = 'http://localhost:4321'; // Nutze deinen lokalen Astro-Server für die Tests
const REPETITIONS = 1; // n=5 für statistische Signifikanz
const OUTPUT_FILE = './results/gaio_evaluation_results.csv';

// Deine 8 Test-Arme (Passe die Pfade an dein tatsächliches Routing an)
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

// Der System-Prompt zwingt die KI in die Rolle eines deterministischen Parsers
const SYSTEM_PROMPT = `
Du bist ein automatisierter Web-Scraper und Daten-Extraktor.
Deine Aufgabe ist es, das übergebene HTML-Dokument zu analysieren und folgende Informationen zu extrahieren:
- Alle angebotenen Versicherungstarife (Name und Preis)
- Alle Überschriften (h1-h6)
- Alle Links (Text und href)
- Ob folgende Merkmale vorhanden sind: JSON-LD, ARIA-Attribute, semantische HTML-Tags, <noscript>, Declarative Shadow DOM, Microdata

Antworte im validen JSON-Format, exakt nach folgendem Schema:
{
  "tarife": [ { "name": "...", "preis": "..." } ],
  "headings": [ "..." ],
  "links": [ { "text": "...", "href": "..." } ],Is
}
Wenn du keine Daten findest, gib leere Arrays und false zurück.
`;

async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  return await response.text();
}

async function evaluateVariant(variant, runIndex) {
  const url = `${BASE_URL}${variant.path}`;
  console.log(`⏳ Teste Variante ${variant.id} (Durchlauf ${runIndex}/${REPETITIONS})...`);

  try {
    const htmlContent = await fetchHtml(url);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Nutze das kleinste Modell für schnelle und kostengünstige Tests
      temperature: 0.0, // Absolut wichtig für die Reproduzierbarkeit!
      seed: 42,         // Fixer Seed minimiert Varianzen
      response_format: { type: "json_object" }, // Zwingt das LLM zu JSON
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
      rawOutput: JSON.stringify(parsedData).replace(/"/g, '""') // CSV-sicheres Escaping
    };
  } catch (error) {
    console.error(`❌ Fehler bei Variante ${variant.id}:`, error.message);
    return { variantId: variant.id, run: runIndex, extractedTariffs: 'ERROR', rawOutput: error.message };
  }
}

async function runEvaluation() {
  if (!API_KEY) {
    console.error("❌ Fehler: OPENAI_API_KEY ist nicht gesetzt.");
    return;
  }

  console.log("🚀 Starte GAIO-Evaluation Pipeline...");
  const results = [];

  // Sequenzielle Ausführung, um Rate-Limits der API zu vermeiden
  for (const variant of VARIANTS) {
    for (let i = 1; i <= REPETITIONS; i++) {
      const res = await evaluateVariant(variant, i);
      results.push(res);
      // Kurze Pause zwischen den Calls (hilft bei Free-Tier Limits)
      await new Promise(r => setTimeout(r, 1000)); 
    }
  }

  // CSV Generierung
  const csvHeader = "Variant_ID,Run,Extracted_Count,Raw_JSON_Output\n";
  const csvRows = results.map(r => `${r.variantId},${r.run},${r.extractedTariffs},"${r.rawOutput}"`).join('\n');
  
  fs.writeFileSync(OUTPUT_FILE, csvHeader + csvRows);
  console.log(`\n✅ Evaluation abgeschlossen! Ergebnisse gespeichert unter: ${OUTPUT_FILE}`);
}

runEvaluation();