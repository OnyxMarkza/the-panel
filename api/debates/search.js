import { searchDebates } from '../../server/lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

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
    return res.status(500).json({ error: true, message: err.message });
  }
}
