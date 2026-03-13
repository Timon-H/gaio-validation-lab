#!/usr/bin/env node

/**
 * GAIO experiment integrity check.
 *
 * Verifies each variant returns healthy responses, canonical middleware headers,
 * and the expected GAIO marker pattern in HTML.
 *
 * Usage:
 *   node ./scripts/test-integrity.mjs [baseUrl]
 *
 * Examples:
 *   node ./scripts/test-integrity.mjs
 *   node ./scripts/test-integrity.mjs http://127.0.0.1:4321
 */

import { VARIANTS } from "../src/data/variants.mjs";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4321";
const FETCH_TIMEOUT_MS = 4000;

const colors = {
  green: "\x1b[0;32m",
  red: "\x1b[0;31m",
  yellow: "\x1b[0;33m",
  reset: "\x1b[0m",
};

const expectedMarkers = {
  control: { ld: false, nosc: false, dsd: false, md: false },
  jsonld: { ld: true, nosc: false, dsd: false, md: false },
  semantic: { ld: false, nosc: false, dsd: false, md: false },
  aria: { ld: false, nosc: false, dsd: false, md: false },
  noscript: { ld: false, nosc: true, dsd: false, md: false },
  dsd: { ld: false, nosc: false, dsd: true, md: false },
  microdata: { ld: false, nosc: false, dsd: false, md: true },
  combined: { ld: true, nosc: false, dsd: true, md: true },
};

let pass = 0;
let fail = 0;

console.log(
  `${colors.green}============================================${colors.reset}`,
);
console.log("GAIO Experiment Integrity Check");
console.log(`Base URL: ${baseUrl}`);
console.log(`Variants: ${VARIANTS.length}`);
console.log(
  `${colors.green}============================================${colors.reset}`,
);
console.log("");

for (const variant of VARIANTS) {
  const url = `${baseUrl}${variant.path}`;
  const expectedGroup = variant.path.replace(/^\//, "");
  const expectedVariantId = variant.id;

  const response = await fetchWithTimeout(url);
  if (!response) {
    logFail(variant.id, "connection", `No response from ${url}`);
    continue;
  }

  const statusOk = response.status >= 200 && response.status < 400;
  const headerGroup = response.headers.get("x-test-group") ?? "(none)";
  const headerVariantId = response.headers.get("x-variant-id") ?? "(none)";

  if (!statusOk) {
    logFail(variant.id, "status", `Expected 2xx/3xx, got ${response.status}`);
  } else {
    logPass(variant.id, "status", `HTTP ${response.status}`);
  }

  if (headerGroup !== expectedGroup) {
    logFail(
      variant.id,
      "header",
      `X-Test-Group expected=${expectedGroup}, got=${headerGroup}`,
    );
  } else {
    logPass(variant.id, "header", `X-Test-Group=${headerGroup}`);
  }

  if (headerVariantId !== expectedVariantId) {
    logFail(
      variant.id,
      "header",
      `X-Variant-Id expected=${expectedVariantId}, got=${headerVariantId}`,
    );
  } else {
    logPass(variant.id, "header", `X-Variant-Id=${headerVariantId}`);
  }

  const html = await response.text();
  const markers = detectMarkers(html);
  const expected = expectedMarkers[variant.id];

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (markers[key] !== expectedValue) {
      logFail(
        variant.id,
        "marker",
        `${key} expected=${expectedValue}, got=${markers[key]}`,
      );
    } else {
      logPass(variant.id, "marker", `${key}=${markers[key]}`);
    }
  }

  console.log("");
}

console.log("============================================");
console.log(
  `Results: ${colors.green}${pass} passed${colors.reset} / ${colors.red}${fail} failed${colors.reset} / ${pass + fail} total`,
);
if (fail > 0) {
  console.log(
    `${colors.red}Integrity check failed. Review variant headers/markers before running evaluations.${colors.reset}`,
  );
  process.exit(1);
}

console.log(`${colors.green}Integrity check passed.${colors.reset}`);

function detectMarkers(html) {
  return {
    ld: /application\/ld\+json/i.test(html),
    nosc: /<noscript>/i.test(html),
    dsd: /shadowrootmode/i.test(html),
    md: /\b(itemscope|itemtype|itemprop)\b/i.test(html),
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { method: "GET", signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function logPass(variantId, area, detail) {
  console.log(
    `${colors.green}[OK]${colors.reset} ${variantId.padEnd(10)} ${area.padEnd(8)} ${detail}`,
  );
  pass += 1;
}

function logFail(variantId, area, detail) {
  console.log(
    `${colors.red}[FAIL]${colors.reset} ${variantId.padEnd(10)} ${area.padEnd(8)} ${detail}`,
  );
  fail += 1;
}
