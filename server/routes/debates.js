import { Router } from 'express';
import {
  fetchDebates,
  fetchDebateById,
  searchDebates,
} from '../lib/supabase.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/debates
// Returns a paginated list of past debates, newest first.
// Query params: limit (default 10), offset (default 0)
// Response: { debates: [...], total: number, hasMore: boolean }
// ---------------------------------------------------------------------------
router.get('/debates', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    const { debates, total } = await fetchDebates(limit, offset);
    res.json({
      debates,
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error('[debates] GET /debates error:', err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/debates/search?q=keyword
// Text search across debate topics. Must be mounted BEFORE /:id so Express
// doesn't treat "search" as an id parameter.
// Response: { debates: [...] }
// ---------------------------------------------------------------------------
router.get('/debates/search', async (req, res) => {
  const query = (req.query.q ?? '').trim();

  if (!query) {
    return res.status(400).json({ error: true, message: 'Query param "q" is required.' });
  }

  try {
    const debates = await searchDebates(query);
    res.json({ debates });
  } catch (err) {
    console.error('[debates] GET /debates/search error:', err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/debates/:id
// Returns a full debate object including personas and messages arrays.
// Response: { id, topic, created_at, summary, verdict, personas: [...], messages: [...] }
// ---------------------------------------------------------------------------
router.get('/debates/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const debate = await fetchDebateById(id);
    res.json(debate);
  } catch (err) {
    console.error(`[debates] GET /debates/${id} error:`, err.message);
    // If the error message includes "multiple" or "0 rows" it means not found.
    const status = err.message.includes('0 rows') ? 404 : 500;
    res.status(status).json({ error: true, message: err.message });
  }
});

export default router;
