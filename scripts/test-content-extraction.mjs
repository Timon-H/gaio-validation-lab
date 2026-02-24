#!/usr/bin/env node

import { createHash } from 'node:crypto';

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

const variants = [
  'control',
  'combined',
  'test-jsonld-only',
  'test-semantic-only',
  'test-noscript-only',
  'test-aria-only',
  'test-dsd',
  'test-microdata-only',
];

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

for (const variant of variants) {
  for (const bot of bots) {
    const url = `${baseUrl}/${variant}`;
    const html = await fetchHtml(url, bot.ua);

    if (!html) {
      logRow(variant, bot.name, ['ERR', '-', '-', '-', '-', '-', '-', '-', '-', '-']);
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

    let dbStatus = '-';

    if (mode === 'persist') {
      const contentHash = createHash('sha256').update(text).digest('hex');
      const textContent = text.slice(0, 10000);
      const jsonLd = extractFirstJsonLd(html);

      const payload = {
        test_group: variant,
        extractor: bot.name,
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

    logRow(variant, bot.name, [String(wordCount), String(headingCount), String(linkCount), ...labels, dbStatus]);
  }
  console.log('');
}

console.log('============================================');
console.log('Legend: LD=JSON-LD, ARIA=aria-label, SEM=semantic HTML, NOSC=<noscript>, DSD=Declarative Shadow DOM, DB=database status');
console.log('');
console.log('Expected GAIO variable pattern (LD / ARIA / SEM / NOSC / DSD):');
console.log('  control           → no  / no  / no  / no  / no');
console.log('  test-jsonld-only  → YES / no  / no  / no  / no');
console.log('  test-semantic-only→ no  / no  / YES / no  / no');
console.log('  test-noscript-only→ no  / no  / no  / YES / no');
console.log('  test-aria-only    → no  / YES / no  / no  / no');
console.log('  test-dsd          → no  / no  / no  / no  / YES');
console.log('  combined          → YES / YES / YES / no  / YES (DSD supersedes noscript)');
console.log('  test-microdata-only → no / no  / no  / no  / no  / YES (microdata)');
console.log('        MD=microdata (itemscope/itemtype/itemprop)');
console.log('');
console.log('NOTE: SEM/ARIA may show infrastructure positives (BaseLayout <nav>, DSD');
console.log('      template internals). These are constant across all pages and cancel');
console.log('      out in comparisons. Focus on the unique GAIO variable per arm.');

if (mode === 'persist') {
  console.log('');
  console.log(`Database: ${colors.green}${persisted} persisted${colors.reset} / ${colors.red}${failed} failed${colors.reset}`);
  console.log('Query your results: SELECT * FROM extraction_results ORDER BY created_at DESC;');
  console.log('Or use the gaio_comparison view for aggregated stats.');
}

console.log('============================================');

async function fetchHtml(url, userAgent) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
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

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text) {
  if (!text) {
    return 0;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

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

async function persistResult(payload) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/extraction_results`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  }).catch(() => null);

  return response?.status === 201;
}

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