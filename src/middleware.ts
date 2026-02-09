import type { MiddlewareHandler } from 'astro';

// 1. Definition der relevanten KI-Crawler
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

  // 2. Filter: Nur Experiment-Seiten verarbeiten, statische Assets ignorieren
  const isGroupA = url.pathname.startsWith('/control-group-a');
  const isGroupB = url.pathname.startsWith('/test-group-b');
  
  if (!isGroupA && !isGroupB) {
    return next();
  }

  const start = Date.now();
  const group = isGroupA ? 'control-group-a' : 'test-group-b';

  // 3. KI-Bot Identifizierung
  const detectedBot = AI_BOTS.find(bot => bot.regex.test(userAgent));
  const isAiBot = !!detectedBot;

  // 4. Request verarbeiten
  const response = await next();

  // 5. Metriken erfassen & Loggen
  const duration = Date.now() - start;
  
  // Strukturiertes Log für die spätere Datenextraktion (Kapitel 6)
  if (isAiBot) {
    const logData = {
      ts: new Date().toISOString(),
      bot: detectedBot?.name,
      group: group,
      path: url.pathname,
      status: response.status,
      lat: `${duration}ms`,
      ua: userAgent
    };
    // Ein einheitlicher Präfix macht das Filtern in Vercel/Cloud-Logs extrem einfach
    console.log(`GAIO_METRIC_DATA: ${JSON.stringify(logData)}`);
  } else {
    // Normales Logging für menschliche Besucher (optional, zur Kontrolle)
    console.log(
      `[${new Date().toISOString()}] HUMAN_VISIT: ${request.method} ${url.pathname} [${group}] ${response.status} (${duration}ms)`
    );
  }

  // 6. Header für manuelle Verifikation setzen
  response.headers.set('X-Test-Group', group);
  response.headers.set('X-AI-Bot-Detected', isAiBot ? 'true' : 'false');
  if (isAiBot && detectedBot?.name) {
    response.headers.set('X-AI-Bot-Name', detectedBot.name);
  }
  response.headers.set('X-Response-Time', `${duration}ms`);

  return response;
};
