import { fetchDebateById } from '../../server/lib/supabase.js';
import { enforceApiKeyForVercel } from '../../shared/apiAuth.js';
import { isUuid, mapSupabaseRouteError } from '../../shared/supabaseRouteErrors.js';
import { handleVercelOptions, setVercelCors } from '../../shared/vercelCors.js';

export default async function handler(req, res) {
  setVercelCors(req, res, 'GET, OPTIONS');
  if (handleVercelOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  if (!enforceApiKeyForVercel(req, res)) return;

  const { id } = req.query;

  if (!isUuid(id)) {
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Invalid debate ID format.',
    });
  }

  try {
    const debate = await fetchDebateById(id);
    return res.status(200).json(debate);
  } catch (err) {
    console.error(`[api/debates/${id}] Error:`, err.message);
    if (err.message.includes('0 rows')) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Debate not found.' });
    }
    const mapped = mapSupabaseRouteError(err, 'Could not fetch debate.');
    return res.status(mapped.status).json(mapped.body);
  }
}
