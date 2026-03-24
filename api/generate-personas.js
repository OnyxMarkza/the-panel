import { callGroq } from '../shared/groqClient.js';

/**
 * Vercel serverless function: POST /api/generate-personas
 *
 * Mirrors the logic in server/routes/personas.js.
 * Generates 3-7 debate personas for a given topic using Groq.
 */
export default async function handler(req, res) {
  // CORS headers — allow requests from any origin in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Respond to preflight requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  const { topic, count } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: true, message: 'A topic string is required.' });
  }

  const requestedCount = Number.isInteger(count) ? count : Number.parseInt(count, 10);
  const personaCount = Number.isNaN(requestedCount)
    ? 5
    : Math.min(7, Math.max(3, requestedCount));

  const systemPrompt = `You are a debate panel generator. When given a topic, you create ${personaCount} distinct, opinionated personas who will debate it.

Return ONLY a valid JSON array with exactly ${personaCount} objects. No markdown, no explanation, no extra text.

Each object must have:
- name: a believable full name
- archetype: a short label describing their worldview (e.g. "Techno-optimist", "Sceptical journalist", "Policy pragmatist")
- bias: a one-sentence description of their slant on the topic
- tone: one word describing their debating style (e.g. "combative", "measured", "sardonic")`;

  const userPrompt = `Generate ${personaCount} debate personas for this topic: "${topic}"`;

  try {
    const raw = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 800);

    // Extract JSON array from the response (handles cases where the model wraps in backticks)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Model did not return a valid JSON array.');
    }

    const personas = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(personas) || personas.length !== personaCount) {
      throw new Error(`Expected exactly ${personaCount} personas.`);
    }

    return res.status(200).json({ personas });
  } catch (err) {
    console.error('[api/generate-personas] Error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
}
