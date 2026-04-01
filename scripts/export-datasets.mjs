#!/usr/bin/env node

/**
 * Export curated thesis datasets from Supabase REST to local CSV files.
 *
 * Writes the following full-row exports into ./datasets:
 * - DATA_bot_logs_rows.csv
 * - DATA_extraction_results_rows.csv
 * - DATA_extraction_comparison.csv
 * - DATA_logging_comparison.csv
 * - DATA_llm_evaluation_results_rows.csv
 * - DATA_llm_evaluation_results_exploratory_rows.csv
 * - DATA_llm_eval_comparison_rows.csv
 * - DATA_llm_eval_comparison_exploratory_rows.csv
 * - DATA_v_macro_f1_scores_rows.csv
 * - DATA_v_macro_f1_scores_exploratory_rows.csv
 *
 * Usage:
 *   node --env-file=.env ./scripts/export-datasets.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DATASET_EXPORTS = [
  {
    source: "bot_logs",
    output: "DATA_bot_logs_rows.csv",
  },
  {
    source: "extraction_results",
    output: "DATA_extraction_results_rows.csv",
  },
  {
    source: "extraction_comparison",
    output: "DATA_extraction_comparison.csv",
  },
  {
    source: "logging_comparison",
    output: "DATA_logging_comparison.csv",
  },
  {
    source: "llm_evaluation_results",
    output: "DATA_llm_evaluation_results_rows.csv",
  },
  {
    source: "llm_evaluation_results_exploratory",
    output: "DATA_llm_evaluation_results_exploratory_rows.csv",
  },
  {
    source: "llm_eval_comparison",
    output: "DATA_llm_eval_comparison_rows.csv",
  },
  {
    source: "llm_eval_comparison_exploratory",
    output: "DATA_llm_eval_comparison_exploratory_rows.csv",
  },
  { source: "v_macro_f1_scores", output: "DATA_v_macro_f1_scores_rows.csv" },
  {
    source: "v_macro_f1_scores_exploratory",
    output: "DATA_v_macro_f1_scores_exploratory_rows.csv",
  },
];

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ Error: export requires SUPABASE_URL and SUPABASE_ANON_KEY to be set.",
  );
  process.exit(1);
}

const baseRestUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
const outputDir = path.resolve("datasets");

await mkdir(outputDir, { recursive: true });
console.log(`📁 Exporting datasets to: ${outputDir}`);

for (const item of DATASET_EXPORTS) {
  const requestUrl = `${baseRestUrl}/${item.source}?select=*`;
  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: "text/csv",
      Prefer: "count=exact",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    console.error(`❌ Export failed for ${item.source} (${response.status})`);
    console.error(body);
    process.exit(1);
  }

  const csv = await response.text();
  const outPath = path.join(outputDir, item.output);
  await writeFile(outPath, csv, "utf8");
  console.log(`✅ ${item.source} -> datasets/${item.output}`);
}

console.log("🎉 Dataset export complete.");
