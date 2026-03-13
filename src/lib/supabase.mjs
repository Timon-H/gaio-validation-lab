/**
 * Shared Supabase REST API insert utility.
 *
 * Used by middleware (bot_logs), evaluate.mjs (llm_evaluation_results),
 * and test-extract.mjs (extraction_results).
 *
 * @param {string} table - Supabase table name.
 * @param {object} payload - Row data to insert.
 * @param {{ timeout?: number }} [options] - Optional timeout in ms.
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
export async function supabaseInsert(table, payload, { timeout } = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: "SUPABASE_URL or SUPABASE_ANON_KEY not set" };
  }

  const controller = timeout ? new AbortController() : undefined;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeout)
    : undefined;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    if (response.ok) {
      return { ok: true, status: response.status };
    }

    const body = await response.text().catch(() => "(no body)");
    return { ok: false, status: response.status, error: body };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return { ok: false, error: isTimeout ? "Timeout reached" : String(err) };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
