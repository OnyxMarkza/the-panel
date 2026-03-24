import { fetchDebates } from '../../server/lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

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
    return res.status(500).json({ error: true, message: err.message });
  }
}
