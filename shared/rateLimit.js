/**
 * Lightweight in-memory rate limiter (Express + Vercel serverless).
 * Best-effort per instance; use edge/WAF for strong global limits on Vercel.
 */

const buckets = new Map();

/**
 * @param {string} key
 * @param {{ windowMs: number, max: number }} config
 * @returns {{ limited: boolean, retryAfterMs?: number }}
 */
export function checkRateLimit(key, { windowMs, max }) {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > max) {
    return { limited: true, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }
  return { limited: false };
}

/** @param {import('http').IncomingMessage} req */
export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (typeof req.socket?.remoteAddress === 'string') {
    return req.socket.remoteAddress;
  }
  return 'unknown';
}

export const RATE_LIMITS = {
  generatePersonas: { windowMs: 5 * 60 * 1000, max: 3 },
  debateRound: { windowMs: 5 * 60 * 1000, max: 10 },
};

/**
 * @returns {boolean} true if request may continue
 */
export function enforceRateLimitForVercel(req, res, namespace, config) {
  const ip = getClientIp(req);
  const result = checkRateLimit(`${namespace}:${ip}`, config);
  if (result.limited) {
    res.status(429).json({
      error: true,
      code: 'RATE_LIMIT',
      message: 'Too many requests. Please try again later.',
    });
    return false;
  }
  return true;
}
