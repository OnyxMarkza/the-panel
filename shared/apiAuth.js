/**
 * Shared API key auth for Express and Vercel handlers.
 *
 * Uses `API_KEY` when set, otherwise falls back to `SAVE_API_KEY` so one secret
 * can protect Groq, storage, and Obsidian routes.
 *
 * When no key is configured: requests are allowed in local dev only (see README).
 * In production (NODE_ENV=production or VERCEL=1), unconfigured or missing keys
 * return 401 for protected routes.
 */

export function getExpectedApiKey() {
  const fromApi = process.env.API_KEY?.trim();
  if (fromApi) return fromApi;
  const fromSave = process.env.SAVE_API_KEY?.trim();
  return fromSave || null;
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

/**
 * @param {import('http').IncomingMessage & { query?: Record<string, string> }} req
 */
export function extractRequestApiKey(req) {
  const headers = req.headers ?? {};
  const headerKey =
    (typeof headers['x-api-key'] === 'string' && headers['x-api-key']) ||
    (typeof headers['X-Api-Key'] === 'string' && headers['X-Api-Key']) ||
    '';
  const queryKey = typeof req.query?.apiKey === 'string' ? req.query.apiKey : '';
  return headerKey || queryKey;
}

/**
 * @param {import('http').IncomingMessage & { query?: Record<string, string> }} req
 * @param {{ requireConfiguredKey?: boolean }} [options]
 * @returns {{ ok: true } | { ok: false, status: number, body: object }}
 */
export function checkApiKey(req, options = {}) {
  const { requireConfiguredKey = false } = options;
  const expected = getExpectedApiKey();
  const isProd = isProductionEnvironment();

  if (!expected) {
    if (isProd || requireConfiguredKey) {
      return {
        ok: false,
        status: 401,
        body: {
          error: true,
          code: 'AUTH_ERROR',
          message: 'Server API key is not configured. Set API_KEY (or SAVE_API_KEY) in the environment.',
        },
      };
    }
    return { ok: true };
  }

  const provided = extractRequestApiKey(req);
  if (provided !== expected) {
    return {
      ok: false,
      status: 401,
      body: {
        error: true,
        code: 'AUTH_ERROR',
        message: 'Invalid or missing API key.',
      },
    };
  }

  return { ok: true };
}

/** Express middleware — Groq and storage proxy routes. */
export function requireApiKeyMiddleware(req, res, next) {
  const result = checkApiKey(req, { requireConfiguredKey: isProductionEnvironment() });
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }
  return next();
}

/** Express middleware — service-role debate list/read (same key as Groq routes). */
export function requireApiKeyForDebatesMiddleware(req, res, next) {
  const result = checkApiKey(req, { requireConfiguredKey: isProductionEnvironment() });
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }
  return next();
}

/**
 * Vercel guard: send 401 JSON when auth fails.
 * @returns {boolean} true if the request may continue
 */
export function vercelApiKeyOptions() {
  return { requireConfiguredKey: isProductionEnvironment() };
}

export function enforceApiKeyForVercel(req, res, options = vercelApiKeyOptions()) {
  const result = checkApiKey(req, options);
  if (!result.ok) {
    res.status(result.status).json(result.body);
    return false;
  }
  return true;
}
