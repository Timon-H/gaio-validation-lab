import type { MiddlewareHandler } from 'astro';
import { VARIANTS } from './data/variants.mjs';
import { supabaseInsert } from './lib/supabase.mjs';

const SUPABASE_TIMEOUT_MS = 1000;

// Definition of relevant AI crawlers
const AI_BOTS = [
  { name: 'ChatGPT', regex: /GPTBot|OAI-SearchBot|ChatGPT-User|ChatGPT Agent/i },
  { name: 'Claude', regex: /ClaudeBot|Claude-Web|Claude-User|Claude-SearchBot|anthropic-ai/i },
  { name: 'Gemini', regex: /Google-Extended|Gemini-Deep-Research|Google-NotebookLM|NotebookLM|GoogleAgent-Mariner/i },
  { name: 'Copilot', regex: /GitHubCopilot|GitHub-Copilot|Copilot/i },
  { name: 'Cursor', regex: /Cursor/i },
  { name: 'Windsurf', regex: /Windsurf|Codeium/i },
  { name: 'Cline', regex: /Cline/i },
  { name: 'Continue', regex: /Continue/i },
  { name: 'Perplexity', regex: /PerplexityBot|Perplexity-User/i },
  { name: 'CommonCrawl', regex: /CCBot/i },
  { name: 'Applebot', regex: /Applebot/i },
  { name: 'Meta', regex: /meta-externalagent|Meta-ExternalAgent|meta-externalfetcher|meta-webindexer/i },
  { name: 'DeepSeek', regex: /DeepSeekBot/i },
  { name: 'Mistral', regex: /MistralAI-User/i },
  { name: 'DuckDuckGo', regex: /DuckAssistBot/i },
  { name: 'Brave', regex: /Bravebot/i },
  { name: 'You', regex: /YouBot/i },
  { name: 'Cohere', regex: /cohere-ai|cohere-training-data-crawler/i },
  { name: 'ByteDance', regex: /Bytespider|TikTokSpider/i },
  { name: 'Manus', regex: /Manus-User/i },
  { name: 'Amazon', regex: /Amazonbot|amazon-kendra|AmazonBuyForMe/i },
];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  const matchedVariant = VARIANTS.find((variant) => url.pathname.startsWith(variant.path));
  if (!matchedVariant) {
    return next();
  }

  const start = Date.now();
  const variantId = matchedVariant.id;
  const group = matchedVariant.path.replace(/^\//, '');

  const detectedBot = AI_BOTS.find(bot => bot.regex.test(userAgent));
  const isAiBot = !!detectedBot;
  const localPersistEnabled = /^(1|true|yes|on)$/i.test(process.env.GAIO_LOCAL_PERSIST ?? '');
  const hasSupabaseConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const hasPersistenceConfig = localPersistEnabled || hasSupabaseConfig;

  const response = await next();
  const duration = Date.now() - start;

  if (isAiBot && hasPersistenceConfig) {
    const logData = {
      bot_name: detectedBot?.name || 'Unknown',
      variant_id: variantId,
      path: url.pathname,
      user_agent: userAgent,
      method: request.method,
      status: response.status,
      latency_ms: duration
    };

    const result = await supabaseInsert('bot_logs', logData, { timeout: SUPABASE_TIMEOUT_MS });

    if (result.ok) {
      console.log(`GAIO_LOG_SUCCESS: ${detectedBot?.name} recorded.`);
    } else {
      console.error('GAIO_LOG_ERROR (Persistence):', result.error);
    }
  }

  // Headers for manual verification
  response.headers.set('X-Test-Group', group);
  response.headers.set('X-Variant-Id', variantId);
  const botHeaderValue = isAiBot && detectedBot ? detectedBot.name : 'false';
  response.headers.set('X-AI-Bot-Detected', botHeaderValue);

  response.headers.set('X-Response-Time', `${duration}ms`);

  return response;
};
