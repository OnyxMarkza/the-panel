/**
 * Optional client API key for production deployments (VITE_API_KEY).
 * Must match server API_KEY / SAVE_API_KEY. Omit in local dev when server auth is bypassed.
 */
export function getApiHeaders(extra = {}) {
  const headers = { ...extra };
  const key = import.meta.env.VITE_API_KEY?.trim();
  if (key) {
    headers['x-api-key'] = key;
  }
  return headers;
}
