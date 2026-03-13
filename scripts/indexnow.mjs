#!/usr/bin/env node

/**
 * Submits all benchmark variant URLs to the IndexNow API.
 *
 * Environment:
 * - SITE_HOST: public host name (without protocol)
 * - INDEXNOW_KEY: key filename/token that must be deployed at /<key>.txt
 *
 * Usage:
 *   node --env-file=.env ./scripts/indexnow.mjs
 */

import { VARIANT_PATHS } from "../src/data/variants.mjs";

const KEY = process.env.INDEXNOW_KEY;
const HOST = process.env.SITE_HOST;

if (!KEY || !HOST) {
  console.error("Missing required env vars: INDEXNOW_KEY and SITE_HOST");
  process.exit(1);
}

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: VARIANT_PATHS.map((path) => `https://${HOST}${path}`),
};

console.log("Submitting to IndexNow...");
console.log("URLs:", body.urlList);

const res = await fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const text = await res.text().catch(() => "(no body)");
console.log(`\nStatus: ${res.status} ${res.statusText}`);
if (text) console.log("Response:", text);

if (res.status === 200) {
  console.log("\n✓ URLs successfully submitted.");
} else if (res.status === 202) {
  console.log("\n✓ Accepted — URLs queued for crawling.");
} else if (res.status === 422) {
  console.log(
    "\n✗ Key file not found or unreachable. Deploy first, then re-run.",
  );
} else {
  console.log("\n✗ Unexpected response. Check status above.");
}
