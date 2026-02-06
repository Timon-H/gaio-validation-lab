import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const start = Date.now();
  const { request } = context;
  
  // Log incoming request
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
  
  // Determine which group this request belongs to
  const url = new URL(request.url);
  let group = 'other';
  if (url.pathname.startsWith('/control-group-a')) {
    group = 'control-group-a';
  } else if (url.pathname.startsWith('/test-group-b')) {
    group = 'test-group-b';
  }
  
  // Continue to the next middleware or route handler
  const response = await next();
  
  // Log response time
  const duration = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ${response.status} (${duration}ms) [${group}]`);
  
  // Add custom headers to track which group served the request
  response.headers.set('X-Test-Group', group);
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  return response;
};
