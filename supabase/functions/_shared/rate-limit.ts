/**
 * Rate Limiter for Edge Functions
 *
 * Simple in-memory rate limiter to prevent abuse of public endpoints.
 * Uses client IP address as the identifier.
 *
 * NOTE: This is in-memory and will reset on function cold starts.
 * For production at scale, consider Redis or Upstash Rate Limiting.
 *
 * Usage:
 *   const { allowed, retryAfter } = checkRateLimit(clientIp, 10, 60000);
 *   if (!allowed) {
 *     return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
 *       status: 429,
 *       headers: { 'Retry-After': retryAfter.toString() }
 *     });
 *   }
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store (resets on cold starts)
const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until retry
  remaining?: number; // Requests remaining in window
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (usually IP address)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Rate limit result with allowed status and retry info
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up expired entry
  if (record && now > record.resetAt) {
    rateLimitMap.delete(identifier);
  }

  // No record or expired - create new window
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
    };
  }

  // Check if limit exceeded
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  // Increment count and allow
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
  };
}

/**
 * Get client IP from request headers
 * Checks common headers in order: x-forwarded-for, x-real-ip, cf-connecting-ip
 *
 * @param req - Deno Request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIp(req: Request): string {
  // Check x-forwarded-for (most common, set by proxies)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP if multiple (original client)
    return forwardedFor.split(',')[0].trim();
  }

  // Check x-real-ip (nginx)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Check cf-connecting-ip (Cloudflare)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  return 'unknown';
}

/**
 * Create rate limit response (429 Too Many Requests)
 *
 * @param retryAfter - Seconds until retry
 * @returns Response object with 429 status
 */
export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.floor((Date.now() + retryAfter * 1000) / 1000).toString(),
      },
    }
  );
}
