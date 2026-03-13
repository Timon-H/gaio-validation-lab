import { appendFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Shared persistence insert utility.
 *
 * Used by middleware (bot_logs), evaluate.mjs (llm_evaluation_results),
 * and test-extract.mjs (extraction_results).
 *
 * Local mode:
 * - Set GAIO_LOCAL_PERSIST=true to write JSONL files to a local folder
 *   instead of calling Supabase REST.
 * - Optional GAIO_LOCAL_DB_DIR overrides the default '.gaio-local-db'.
 *
 * @param {string} table - Logical table name.
 * @param {object} payload - Row data to insert.
 * @param {{ timeout?: number }} [options] - Optional timeout in ms.
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
export async function supabaseInsert(table, payload, { timeout } = {}) {
  const localPersistEnabled = isTruthyEnv(process.env.GAIO_LOCAL_PERSIST);

  if (localPersistEnabled) {
    return localInsert(table, payload);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: 'SUPABASE_URL or SUPABASE_ANON_KEY not set' };
  }

  const controller = timeout ? new AbortController() : undefined;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeout) : undefined;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    if (response.ok) {
      return { ok: true, status: response.status };
    }

    const body = await response.text().catch(() => '(no body)');
    return { ok: false, status: response.status, error: body };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return { ok: false, error: isTimeout ? 'Timeout reached' : String(err) };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Writes a row to a local JSONL file for local persistence testing.
 * @param {string} table
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
async function localInsert(table, payload) {
  try {
    const localDir = process.env.GAIO_LOCAL_DB_DIR || '.gaio-local-db';
    const safeTable = table.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dbDir = resolve(process.cwd(), localDir);
    const filePath = join(dbDir, `${safeTable}.jsonl`);

    const row = {
      created_at: new Date().toISOString(),
      ...payload,
    };

    await mkdir(dbDir, { recursive: true });
    await appendFile(filePath, `${JSON.stringify(row)}\n`, 'utf8');
    return { ok: true, status: 201 };
  } catch (err) {
    return { ok: false, error: `Local persist failed: ${String(err)}` };
  }
}

/**
 * Parses common truthy env values.
 * @param {string | undefined} value
 * @returns {boolean}
 */
function isTruthyEnv(value) {
  return /^(1|true|yes|on)$/i.test(value ?? '');
}
