import { callGroq } from '../shared/groqClient.js';
import {
  validateSuggestionRequestBody,
  buildSuggestionPrompts,
  normalizeSuggestedTopics,
} from '../shared/suggestions.js';

/**
 * Vercel serverless function: POST /api/suggest-topics
 * Body: { seed?: string }
 * Returns: { topics: string[] }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  try {
    const { seed } = validateSuggestionRequestBody(req.body);
    const { systemPrompt, userPrompt } = buildSuggestionPrompts(seed);

    const raw = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 200);

    const topics = normalizeSuggestedTopics(raw);
    return res.status(200).json({ topics });
  } catch (err) {
    console.error('[api/suggest-topics] Error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
}
