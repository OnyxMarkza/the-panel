import { searchDebates } from '../../server/lib/supabase.js';
import { enforceApiKeyForVercel } from '../../shared/apiAuth.js';
import { mapSupabaseRouteError } from '../../shared/supabaseRouteErrors.js';
import { handleVercelOptions, setVercelCors } from '../../shared/vercelCors.js';

export default async function handler(req, res) {
  setVercelCors(req, res, 'GET, OPTIONS');
  if (handleVercelOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  if (!enforceApiKeyForVercel(req, res)) return;

  const query = (req.query.q ?? '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  if (!query) return res.status(400).json({ error: true, message: 'Query param "q" is required.' });
  if (query.length > 100) {
    return res.status(400).json({ error: true, message: 'Search query must be 100 characters or less.' });
  }

  try {
    const debates = await searchDebates(query, limit);
    return res.status(200).json({ debates });
  } catch (err) {
    console.error('[api/debates/search] Error:', err.message);
    const mapped = mapSupabaseRouteError(err, 'Could not search debates.');
    return res.status(mapped.status).json(mapped.body);
  }
}
