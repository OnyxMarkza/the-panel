import { SupabaseNotConfiguredError } from '../server/lib/supabase.js';

export function mapSupabaseRouteError(err, fallbackMessage) {
  if (err instanceof SupabaseNotConfiguredError) {
    return {
      status: 503,
      body: { error: true, code: 'SERVICE_UNAVAILABLE', message: err.message },
    };
  }
  return {
    status: 500,
    body: { error: true, code: 'INTERNAL_ERROR', message: fallbackMessage },
  };
}

export function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
