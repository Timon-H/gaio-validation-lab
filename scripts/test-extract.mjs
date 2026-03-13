#!/usr/bin/env node

/**
 * GAIO structural extraction smoke test.
 *
 * What it does:
 * - Fetches every variant route using a small extractor/bot set.
 * - Reports structural markers (word count, headings, links, GAIO marker presence).
 * - Optionally persists rows to Supabase `extraction_results` with `--persist`.
 *
 * Usage:
 *   node ./scripts/test-extract.mjs [--persist] [baseUrl]
 *
 * Examples:
 *   node ./scripts/test-extract.mjs
 *   node ./scripts/test-extract.mjs https://gaio-validation-lab.vercel.app
 *   node --env-file=.env ./scripts/test-extract.mjs --persist
 */

import { createHash } from 'node:crypto';
import { VARIANTS } from '../src/data/variants.mjs';
import { supabaseInsert } from '../src/lib/supabase.mjs';

const FETCH_TIMEOUT_MS = 4000;
const MAX_TEXT_LENGTH = 10_000;

const args = process.argv.slice(2);
const mode = args.includes('--persist') ? 'persist' : 'dry-run';
const baseUrlArg = args.find((arg) => arg.startsWith('http'));
const baseUrl = baseUrlArg ?? 'http://localhost:4321';

if (mode === 'persist') {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('ERROR: --persist mode requires SUPABASE_URL and SUPABASE_ANON_KEY env vars.');
    console.error('Set them in your shell or .env file.');
    process.exit(1);
  }
  console.log(`Supabase: ${process.env.SUPABASE_URL} (persist mode)`);
}

const variants = VARIANTS.map((variant) => ({
  id: variant.id,
  slug: variant.path.replace(/^\//, ''),
}));

const bots = [
  {
    name: 'GPTBot',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  },
  {
    name: 'ClaudeBot',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-Web/1.0; +https://anthropic.com)',
  },
  {
    name: 'GoogleBot',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  {
    name: 'curl',
    ua: 'curl/8.0',
  },
];

const colors = {
  green: '\x1b[0;32m',
  red: '\x1b[0;31m',
  reset: '\x1b[0m',
};

// Expected GAIO marker pattern per variant.
// aria/sem are not asserted: BaseLayout <nav> produces infrastructure positives
// on all pages, making false-negatives impossible to distinguish from real signals.
const expected = {
  control:   { ld: false, nosc: false, dsd: false, md: false },
  jsonld:    { ld: true,  nosc: false, dsd: false, md: false },
  semantic:  { ld: false, nosc: false, dsd: false, md: false },
  noscript:  { ld: false, nosc: true,  dsd: false, md: false },
  aria:      { ld: false, nosc: false, dsd: false, md: false },
  dsd:       { ld: false, nosc: false, dsd: true,  md: false },
  microdata: { ld: false, nosc: false, dsd: false, md: true  },
  combined:  { ld: true,  nosc: false, dsd: true,  md: true  },
};

const header = [
  'VARIANT'.padEnd(22),
  'BOT'.padEnd(10),
  'WORDS'.padStart(6),
  'HEADS'.padStart(5),
  'LINKS'.padStart(5),
  'LD'.padStart(5),
  'ARIA'.padStart(5),
  'SEM'.padStart(5),
  'NOSC'.padStart(5),
  'DSD'.padStart(5),
  'MD'.padStart(4),
  'DB',
].join(' | ');

console.log('============================================');
console.log('GAIO Content Extraction Test');
console.log(`Base URL: ${baseUrl}`);
console.log(`Mode:     ${mode}`);
console.log(`Variants: ${variants.length}  |  Bots: ${bots.map((entry) => entry.name).join(' ')}`);
console.log('============================================');
console.log('');
console.log(header);
console.log('-------------------------------------------------------------------------------------------------------------');

let persisted = 0;
let failed = 0;
let assertFailed = 0;

for (const variant of variants) {
  for (const bot of bots) {
    const url = `${baseUrl}/${variant.slug}`;
    const html = await fetchHtml(url, bot.ua);

    if (!html) {
      logRow(variant.id, bot.name, ['ERR', '-', '-', '-', '-', '-', '-', '-', '-', '-']);
      failed += 1;
      continue;
    }

    const text = stripHtml(html);
    const wordCount = countWords(text);
    const headingCount = countMatches(html, /<h[1-6][^>]*>/gi);
    const linkCount = countMatches(html, /<a\s/gi);

    const hasJsonLd = /application\/ld\+json/i.test(html);
    const hasAria = /aria-label/i.test(html);
    const hasSemantic = /<(section|article|address|aside|nav|main)\b/i.test(html);
    const hasNoscript = /<noscript>/i.test(html);
    const hasDsd = /shadowrootmode/i.test(html);
    const hasMicrodata = /\b(itemscope|itemtype|itemprop)\b/i.test(html);

    const labels = [
      hasJsonLd ? 'YES' : 'no',
      hasAria ? 'YES' : 'no',
      hasSemantic ? 'YES' : 'no',
      hasNoscript ? 'YES' : 'no',
      hasDsd ? 'YES' : 'no',
      hasMicrodata ? 'YES' : 'no',
    ];

    // Assert marker pattern once per variant (first bot is sufficient; HTML is UA-invariant).
    if (bot === bots[0] && expected[variant.id]) {
      const actual = { ld: hasJsonLd, nosc: hasNoscript, dsd: hasDsd, md: hasMicrodata };
      const fails = Object.entries(expected[variant.id]).filter(([k, v]) => actual[k] !== v);
      fails.forEach(([k, v]) => {
        console.log(`  ${colors.red}[ASSERT]${colors.reset} ${variant.id}: expected ${k}=${v}, got ${actual[k]}`);
      });
      assertFailed += fails.length;
    }

    let dbStatus = '-';

    if (mode === 'persist') {
      const contentHash = createHash('sha256').update(text).digest('hex');
      const textContent = text.slice(0, MAX_TEXT_LENGTH);
      const jsonLd = extractFirstJsonLd(html);

      const payload = {
        variant_id: variant.id,
        extractor: bot.name,
        request_url: url,
        base_url: baseUrl,
        content_hash: contentHash,
        text_content: textContent,
        json_ld: jsonLd,
        heading_count: headingCount,
        link_count: linkCount,
        word_count: wordCount,
        has_noscript: hasNoscript,
        has_aria: hasAria,
        has_semantic: hasSemantic,
        has_jsonld: hasJsonLd,
        has_dsd: hasDsd,
        has_microdata: hasMicrodata,
      };

      const persistedOk = await persistResult(payload);
      if (persistedOk) {
        dbStatus = `${colors.green}OK${colors.reset}`;
        persisted += 1;
      } else {
        dbStatus = `${colors.red}ERR${colors.reset}`;
        failed += 1;
      }
    }

    logRow(variant.id, bot.name, [String(wordCount), String(headingCount), String(linkCount), ...labels, dbStatus]);
  }
  console.log('');
}

console.log('============================================');
console.log('Legend: LD=JSON-LD, ARIA=aria-label, SEM=semantic HTML, NOSC=<noscript>, DSD=Declarative Shadow DOM, DB=database status');
console.log('');
console.log('Expected GAIO variable pattern (LD / ARIA / SEM / NOSC / DSD):');
console.log('  control           → no  / no  / no  / no  / no');
console.log('  jsonld            → YES / no  / no  / no  / no');
console.log('  semantic          → no  / no  / YES / no  / no');
console.log('  noscript          → no  / no  / no  / YES / no');
console.log('  aria              → no  / YES / no  / no  / no');
console.log('  dsd               → no  / no  / no  / no  / YES');
console.log('  combined          → YES / YES / YES / no  / YES (DSD supersedes noscript)');
console.log('  microdata         → no  / no  / no  / no  / YES (microdata)');
console.log('        MD=microdata (itemscope/itemtype/itemprop)');
console.log('');
console.log('NOTE: SEM/ARIA may show infrastructure positives (BaseLayout <nav>, DSD');
console.log('      template internals). These are constant across all pages and cancel');
console.log('      out in comparisons. Focus on the unique GAIO variable per arm.');

if (mode === 'persist') {
  console.log('');
  console.log(`Database: ${colors.green}${persisted} persisted${colors.reset} / ${colors.red}${failed} failed${colors.reset}`);
  console.log('Query your results: SELECT * FROM extraction_results ORDER BY created_at DESC;');
  console.log('Or use the extraction_comparison view for aggregated stats.');
}

if (assertFailed > 0) {
  console.log(`\n${colors.red}✗ ${assertFailed} marker assertion(s) failed — check for cross-contamination.${colors.reset}`);
} else {
  console.log(`\n${colors.green}✓ All marker assertions passed.${colors.reset}`);
}
console.log('============================================');

if (assertFailed > 0) process.exit(1);

/**
 * Fetches the HTML of a page variant using the specified user-agent string.
 * Times out after 4 seconds to prevent hanging on unresponsive servers.
 * @param {string} url - Full URL of the variant to fetch.
 * @param {string} userAgent - User-agent string to send with the request.
 * @returns {Promise<string>} Raw HTML, or an empty string on error.
 */
async function fetchHtml(url, userAgent) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
      },
    });
    return await response.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strips all HTML tags and collapses whitespace to produce plain text.
 * @param {string} html - Raw HTML string.
 * @returns {string} Plain text content.
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Counts the number of whitespace-delimited words in a text string.
 * @param {string} text - Plain text to count.
 * @returns {number} Word count.
 */
function countWords(text) {
  if (!text) {
    return 0;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Counts all non-overlapping matches of a regex in a string.
 * @param {string} text - Text to search.
 * @param {RegExp} regex - Pattern to match (should use the `g` flag).
 * @returns {number} Number of matches.
 */
function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Extracts and parses the first `<script type="application/ld+json">` block from HTML.
 * @param {string} html - Raw HTML string.
 * @returns {object|null} Parsed JSON-LD object, or `null` if absent or invalid.
 */
function extractFirstJsonLd(html) {
  const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match || !match[1]) {
    return null;
  }

  const raw = match[1].trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persists a single extraction result row to the Supabase `extraction_results` table.
 * @param {object} payload - Row data matching the table schema.
 * @returns {Promise<boolean>} `true` if the insert succeeded, `false` otherwise.
 */
async function persistResult(payload) {
  const result = await supabaseInsert('extraction_results', payload);
  if (!result.ok) {
    console.error('Persist failed:', result.status, result.error);
  }
  return result.ok;
}

/**
 * Prints a formatted result row to stdout with fixed-width column alignment.
 * @param {string} variant - Variant identifier.
 * @param {string} botName - Simulated bot name.
 * @param {string[]} values - Column values: [words, heads, links, ld, aria, sem, nosc, dsd, md, db].
 */
function logRow(variant, botName, values) {
  const [words, heads, links, ld, aria, sem, nosc, dsd, md, db] = values;
  const row = [
    variant.padEnd(22),
    botName.padEnd(10),
    String(words).padStart(6),
    String(heads).padStart(5),
    String(links).padStart(5),
    String(ld).padStart(5),
    String(aria).padStart(5),
    String(sem).padStart(5),
    String(nosc).padStart(5),
    String(dsd).padStart(5),
    String(md).padStart(4),
    db,
  ].join(' | ');

  console.log(row);
}