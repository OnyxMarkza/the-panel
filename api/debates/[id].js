import { fetchDebateById } from '../../server/lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  const { id } = req.query;

  try {
    const debate = await fetchDebateById(id);
    return res.status(200).json(debate);
  } catch (err) {
    console.error(`[api/debates/${id}] Error:`, err.message);
    const status = err.message.includes('0 rows') ? 404 : 500;
    return res.status(status).json({ error: true, message: err.message });
  }
}
