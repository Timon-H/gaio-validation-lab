import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);
  
  // Only process experiment pages, skip static assets
  const isExperimentPage = url.pathname.startsWith('/control-group-a') || 
                           url.pathname.startsWith('/test-group-b');
  
  if (!isExperimentPage) {
    return next();
  }
  
  const start = Date.now();
  
  // Log only pathname to prevent leaking sensitive query parameters
  console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);
  
  // Determine which group this request belongs to
  const group = url.pathname.startsWith('/control-group-a') 
    ? 'control-group-a' 
    : 'test-group-b';
  
  // Continue to the next middleware or route handler
  const response = await next();
  
  // Log response time
  const duration = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname} - ${response.status} (${duration}ms) [${group}]`);
  
  // Add custom headers to track which group served the request
  response.headers.set('X-Test-Group', group);
  response.headers.set('X-Response-Time', `${duration}ms`);
  
  return response;
};
