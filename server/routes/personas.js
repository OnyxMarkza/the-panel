import { Router } from 'express';
import { callGroq } from '../lib/groq.js';

const router = Router();

/**
 * POST /api/generate-personas
 * Body: { topic: string }
 * Returns: Array of 5 persona objects { name, archetype, bias, tone }
 *
 * We ask Groq to return a raw JSON array so we can parse it directly.
 */
router.post('/generate-personas', async (req, res) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: true, message: 'A topic string is required.' });
  }

  const systemPrompt = `You are a debate panel generator. When given a topic, you create 5 distinct, opinionated personas who will debate it.

Return ONLY a valid JSON array with exactly 5 objects. No markdown, no explanation, no extra text.

Each object must have:
- name: a believable full name
- archetype: a short label describing their worldview (e.g. "Techno-optimist", "Sceptical journalist", "Policy pragmatist")
- bias: a one-sentence description of their slant on the topic
- tone: one word describing their debating style (e.g. "combative", "measured", "sardonic")`;

  const userPrompt = `Generate 5 debate personas for this topic: "${topic}"`;

  try {
    const raw = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 800);

    // Extract JSON array from the response (handles cases where model wraps in backticks)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Model did not return a valid JSON array.');
    }

    const personas = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(personas) || personas.length !== 5) {
      throw new Error('Expected exactly 5 personas.');
    }

    res.json({ personas });
  } catch (err) {
    console.error('[personas] Error:', err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
