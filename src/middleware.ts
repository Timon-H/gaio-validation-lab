import type { MiddlewareHandler } from 'astro';

// Definition of relevant AI crawlers
const AI_BOTS = [
  { name: 'ChatGPT', regex: /GPTBot|OAI-SearchBot|ChatGPT-User/i },
  { name: 'Claude', regex: /ClaudeBot|Claude-Web|anthropic-ai/i },
  { name: 'Gemini', regex: /Google-Extended/i },
  { name: 'Perplexity', regex: /PerplexityBot|Perplexity-User/i },
  { name: 'CommonCrawl', regex: /CCBot/i },
  { name: 'Applebot', regex: /Applebot-Extended/i },
  { name: 'Meta', regex: /meta-externalagent/i },
];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  const isControl = url.pathname.startsWith('/control');
  const isCombined = url.pathname.startsWith('/combined');
  const isIsolatedTest = url.pathname.startsWith('/test-jsonld-only')
    || url.pathname.startsWith('/test-semantic-only')
    || url.pathname.startsWith('/test-noscript-only')
    || url.pathname.startsWith('/test-aria-only')
    || url.pathname.startsWith('/test-dsd')
    || url.pathname.startsWith('/test-microdata-only');
  
  if (!isControl && !isCombined && !isIsolatedTest) {
    return next();
  }

  const start = Date.now();
  // Use the first path segment as the group identifier
  const group = url.pathname.split('/').filter(Boolean)[0] || 'unknown';

  const detectedBot = AI_BOTS.find(bot => bot.regex.test(userAgent));
  const isAiBot = !!detectedBot;

  const response = await next();
  const duration = Date.now() - start;
  
  if (isAiBot) {
    // Prepare log data for Supabase (matches bot_logs schema)
    const logData = {
      bot_name: detectedBot?.name || 'Unknown',
      test_group: group,
      path: url.pathname,
      user_agent: userAgent,
      method: request.method,
      status: response.status,
      latency_ms: duration
    };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      // AbortController stops slow requests to prevent hanging the middleware
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout

      try {
        const resp = await fetch(`${supabaseUrl}/rest/v1/bot_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(logData),
          signal: controller.signal
        });

        if (resp?.ok) {
          console.log(`GAIO_LOG_SUCCESS: ${detectedBot?.name} recorded.`);
        } else {
          const body = await resp.text().catch(() => '(no body)');
          console.error('GAIO_LOG_ERROR (Supabase):', resp.status, body);
        }
      } catch (err) {
        console.error("GAIO_LOG_ERROR (Supabase):", err instanceof Error && err.name === 'AbortError'
          ? "Timeout reached"
          : err);
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  // Headers for manual verification
  response.headers.set('X-Test-Group', group);
  const botHeaderValue = isAiBot && detectedBot ? detectedBot.name : 'false';
  response.headers.set('X-AI-Bot-Detected', botHeaderValue);
  
  response.headers.set('X-Response-Time', `${duration}ms`);

  return response;
};
