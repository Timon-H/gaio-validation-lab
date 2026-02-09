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
  
  // Prepare log data
  const logData = {
    ts: new Date().toISOString(),
    bot: detectedBot?.name,
    group: group,
    method: request.method,
    path: url.pathname,
    status: response.status,
    latencyMs: duration,
    ua: userAgent
  };
  
  if (isAiBot) {
    console.log(`GAIO_METRIC_DATA: ${JSON.stringify(logData)}`);
  } else {
    // Optional logging for human visits
    console.log(
      `[${new Date().toISOString()}] HUMAN_VISIT: ${request.method} ${url.pathname} [${group}] ${response.status} (${duration}ms)`
    );

    // Vercel Edge Environment variables for Supabase
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      fetch(`${supabaseUrl}/rest/v1/bot_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(logData)
      }).catch(err => console.error("Supabase Log Error:", err));
    }
  }

  // Headers for manual verification
  response.headers.set('X-Test-Group', group);
  response.headers.set('X-AI-Bot-Detected', isAiBot ? 'true' : 'false');
  if (isAiBot && detectedBot?.name) {
    response.headers.set('X-AI-Bot-Name', detectedBot.name);
  }
  response.headers.set('X-Response-Time', `${duration}ms`);

  return response;
};
