import type { MiddlewareHandler } from 'astro';

// Definition of relevant AI crawlers
const AI_BOTS = [
  { name: 'ChatGPT', regex: /GPTBot|OAI-SearchBot/i },
  { name: 'Claude', regex: /Claude-Web|AnthropicAI/i },
  { name: 'Gemini', regex: /Google-Extended/i },
  { name: 'Perplexity', regex: /PerplexityBot/i },
  { name: 'CommonCrawl', regex: /CCBot/i },
  { name: 'Applebot', regex: /Applebot-Extended/i }
];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  const isGroupA = url.pathname.startsWith('/control-group-a');
  const isGroupB = url.pathname.startsWith('/test-group-b');
  
  if (!isGroupA && !isGroupB) {
    return next();
  }

  const start = Date.now();
  const group = isGroupA ? 'control-group-a' : 'test-group-b';

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
      await fetch(`${supabaseUrl}/rest/v1/bot_logs`, {
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
      console.log(`GAIO_LOG_SUCCESS: ${detectedBot?.name} recorded.`);
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
