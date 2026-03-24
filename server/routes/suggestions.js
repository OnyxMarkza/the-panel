import { Router } from 'express';
import { callGroq } from '../lib/groq.js';
import {
  validateSuggestionRequestBody,
  buildSuggestionPrompts,
  normalizeSuggestedTopics,
} from '../../shared/suggestions.js';

const router = Router();

/**
 * POST /api/suggest-topics
 * Body: { seed?: string }
 * Returns: { topics: string[] }
 */
router.post('/suggest-topics', async (req, res) => {
  try {
    const { seed } = validateSuggestionRequestBody(req.body);
    const { systemPrompt, userPrompt } = buildSuggestionPrompts(seed);

    const raw = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 200);

    const topics = normalizeSuggestedTopics(raw);
    return res.json({ topics });
  } catch (err) {
    console.error('[suggest-topics] Error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
