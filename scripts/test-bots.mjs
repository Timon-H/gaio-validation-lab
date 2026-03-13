#!/usr/bin/env node

/**
 * GAIO middleware bot-detection header validation.
 *
 * Sends HEAD requests to all variant routes with representative bot/user-agent tokens
 * and validates that middleware responds with expected `X-AI-Bot-Detected`,
 * `X-Test-Group`, and `X-Variant-Id` headers.
 *
 * Usage:
 *   node ./scripts/test-bots.mjs [baseUrl]
 *
 * Examples:
 *   node ./scripts/test-bots.mjs
 *   node ./scripts/test-bots.mjs https://gaio-validation-lab.vercel.app
 */

import { VARIANTS } from '../src/data/variants.mjs';

const baseUrl = process.argv[2] ?? 'http://localhost:4321';

const variants = VARIANTS.map(v => ({
  id: v.id,
  slug: v.path.replace(/^\//, ''),
}));

const FETCH_TIMEOUT_MS = 4000;

const bots = [
  { userAgent: 'GPTBot', expected: 'ChatGPT' },
  { userAgent: 'ChatGPT-User', expected: 'ChatGPT' },
  { userAgent: 'OAI-SearchBot', expected: 'ChatGPT' },
  { userAgent: 'ChatGPT Agent', expected: 'ChatGPT' },
  { userAgent: 'ClaudeBot', expected: 'Claude' },
  { userAgent: 'Claude-Web', expected: 'Claude' },
  { userAgent: 'Claude-User', expected: 'Claude' },
  { userAgent: 'Claude-SearchBot', expected: 'Claude' },
  { userAgent: 'anthropic-ai', expected: 'Claude' },
  { userAgent: 'Google-Extended', expected: 'Gemini' },
  { userAgent: 'Gemini-Deep-Research', expected: 'Gemini' },
  { userAgent: 'Google-NotebookLM', expected: 'Gemini' },
  { userAgent: 'NotebookLM', expected: 'Gemini' },
  { userAgent: 'GoogleAgent-Mariner', expected: 'Gemini' },
  { userAgent: 'GitHubCopilot/1.0', expected: 'Copilot' },
  { userAgent: 'Cursor/1.0', expected: 'Cursor' },
  { userAgent: 'Windsurf/1.0', expected: 'Windsurf' },
  { userAgent: 'Cline/1.0', expected: 'Cline' },
  { userAgent: 'Continue/1.0', expected: 'Continue' },
  { userAgent: 'PerplexityBot', expected: 'Perplexity' },
  { userAgent: 'Perplexity-User', expected: 'Perplexity' },
  { userAgent: 'CCBot', expected: 'CommonCrawl' },
  { userAgent: 'Applebot', expected: 'Applebot' },
  { userAgent: 'Applebot-Extended', expected: 'Applebot' },
  { userAgent: 'meta-externalagent', expected: 'Meta' },
  { userAgent: 'Meta-ExternalAgent', expected: 'Meta' },
  { userAgent: 'meta-externalfetcher', expected: 'Meta' },
  { userAgent: 'meta-webindexer', expected: 'Meta' },
  { userAgent: 'DeepSeekBot', expected: 'DeepSeek' },
  { userAgent: 'MistralAI-User', expected: 'Mistral' },
  { userAgent: 'DuckAssistBot', expected: 'DuckDuckGo' },
  { userAgent: 'Bravebot', expected: 'Brave' },
  { userAgent: 'YouBot', expected: 'You' },
  { userAgent: 'cohere-ai', expected: 'Cohere' },
  { userAgent: 'Bytespider', expected: 'ByteDance' },
  { userAgent: 'TikTokSpider', expected: 'ByteDance' },
  { userAgent: 'Manus-User', expected: 'Manus' },
  { userAgent: 'Amazonbot', expected: 'Amazon' },
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
  const url = `${baseUrl}/${variant.slug}`;
  console.log(`${colors.yellow}--- ${variant.slug} ---${colors.reset}`);

  for (const { userAgent, expected } of bots) {
    let response;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
    const actualGroup = response.headers.get('x-test-group') ?? '(none)';
    const actualVariantId = response.headers.get('x-variant-id') ?? '(none)';
    const httpStatus = response.status;

    const botOk = actualBot.includes(expected);
    const groupOk = actualGroup === variant.slug;
    const variantIdOk = actualVariantId === variant.id;
    const statusOk = httpStatus >= 200 && httpStatus < 400;

    if (botOk && groupOk && variantIdOk && statusOk) {
      console.log(
        `  ${userAgent} → ${colors.green}[OK]${colors.reset} Bot=${actualBot} Group=${actualGroup} Variant=${actualVariantId} HTTP=${httpStatus}`,
      );
      pass += 1;
      continue;
    }

    const reasons = [
      !botOk ? `Bot expected=${expected} got=${actualBot || '(none)'}` : '',
      !groupOk ? `X-Test-Group expected=${variant.slug} got=${actualGroup}` : '',
      !variantIdOk ? `X-Variant-Id expected=${variant.id} got=${actualVariantId}` : '',
      !statusOk ? `HTTP expected 2xx/3xx got=${httpStatus}` : '',
    ].filter(Boolean).join('; ');

    console.log(`  ${userAgent} → ${colors.red}[FAIL]${colors.reset} ${reasons}`);
    fail += 1;
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