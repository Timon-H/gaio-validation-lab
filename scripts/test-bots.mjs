#!/usr/bin/env node

const baseUrl = process.argv[2] ?? 'http://localhost:4321';

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
  { userAgent: 'GPTBot', expected: 'ChatGPT' },
  { userAgent: 'ChatGPT-User', expected: 'ChatGPT' },
  { userAgent: 'OAI-SearchBot', expected: 'ChatGPT' },
  { userAgent: 'ClaudeBot', expected: 'Claude' },
  { userAgent: 'Claude-Web', expected: 'Claude' },
  { userAgent: 'anthropic-ai', expected: 'Claude' },
  { userAgent: 'Google-Extended', expected: 'Gemini' },
  { userAgent: 'Applebot-Extended', expected: 'Applebot' },
  { userAgent: 'meta-externalagent', expected: 'Meta' },
  { userAgent: 'PerplexityBot/1.0', expected: 'Perplexity' },
  { userAgent: 'Perplexity-User/1.0', expected: 'Perplexity' },
  { userAgent: 'CCBot', expected: 'CommonCrawl' },
  { userAgent: 'Mozilla/5.0 (Chrome)', expected: 'false' },
];

const colors = {
  green: '\x1b[0;32m',
  red: '\x1b[0;31m',
  yellow: '\x1b[0;33m',
  reset: '\x1b[0m',
};

let pass = 0;
let fail = 0;

console.log(`${colors.green}============================================${colors.reset}`);
console.log('GAIO Middleware & Header Validation');
console.log(`Base URL: ${baseUrl}`);
console.log(`Variants: ${variants.length}  |  Bot UAs: ${bots.length}`);
console.log(`${colors.green}============================================${colors.reset}`);
console.log('');

for (const variant of variants) {
  const url = `${baseUrl}/${variant}`;
  console.log(`${colors.yellow}--- ${variant} ---${colors.reset}`);

  for (const { userAgent, expected } of bots) {
    let response;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
          },
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      console.log(`  ${userAgent} → ${colors.red}[CONN ERROR]${colors.reset}`);
      fail += 1;
      continue;
    }

    const actualBot = response.headers.get('x-ai-bot-detected') ?? '';
    const actualGroup = response.headers.get('x-test-group') ?? '';
    const httpStatus = response.status;

    if (actualBot.includes(expected)) {
      console.log(
        `  ${userAgent} → ${colors.green}[OK]${colors.reset} Bot=${actualBot} Group=${actualGroup} HTTP=${httpStatus}`,
      );
      pass += 1;
    } else {
      console.log(
        `  ${userAgent} → ${colors.red}[FAIL]${colors.reset} Expected=${expected} Got=${actualBot || '(none)'} HTTP=${httpStatus}`,
      );
      fail += 1;
    }
  }

  console.log('');
}

const total = pass + fail;
console.log('============================================');
console.log(
  `Results: ${colors.green}${pass} passed${colors.reset} / ${colors.red}${fail} failed${colors.reset} / ${total} total`,
);
console.log('');
console.log('Next steps:');
console.log('  1. Check the Astro dev server terminal for GAIO_LOG_SUCCESS entries');
console.log('  2. If SUPABASE_URL is set, check bot_logs table in Supabase');
console.log('============================================');