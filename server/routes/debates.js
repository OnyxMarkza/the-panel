import { Router } from 'express';
import {
  fetchDebates,
  fetchDebateById,
  searchDebates,
} from '../lib/supabase.js';

const router = Router();

function parsePositiveInt(raw, fallback, max) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

router.get('/debates', async (req, res) => {
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const offset = parsePositiveInt(req.query.offset, 0, 100000);

  try {
    const { debates, total } = await fetchDebates(limit, offset);
    return res.json({
      debates,
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error('[debates] GET /debates error:', err.message);
    return res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Could not fetch debates.' });
  }
});

router.get('/debates/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = parsePositiveInt(req.query.limit, 20, 50);

  if (!query) {
    return res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'Query param "q" is required.' });
  }

  if (query.length > 100) {
    return res.status(422).json({ error: true, code: 'VALIDATION_ERROR', message: 'Search query must be 100 characters or less.' });
  }

  try {
    const debates = await searchDebates(query, limit);
    return res.json({ debates });
  } catch (err) {
    console.error('[debates] GET /debates/search error:', err.message);
    return res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Could not search debates.' });
  }
});

router.get('/debates/:id', async (req, res) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'Invalid debate ID format.' });
  }

  try {
    const debate = await fetchDebateById(id);
    return res.json(debate);
  } catch (err) {
    console.error(`[debates] GET /debates/${id} error:`, err.message);
    const status = err.message.includes('0 rows') ? 404 : 500;
    const code = status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR';
    return res.status(status).json({ error: true, code, message: status === 404 ? 'Debate not found.' : 'Could not fetch debate.' });
  }
});

export default router;
