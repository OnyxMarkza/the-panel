import { fetchDebates } from '../../server/lib/supabase.js';
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

  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    const { debates, total } = await fetchDebates(limit, offset);
    return res.status(200).json({
      debates,
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error('[api/debates] Error:', err.message);
    const mapped = mapSupabaseRouteError(err, 'Could not fetch debates.');
    return res.status(mapped.status).json(mapped.body);
  }
}
