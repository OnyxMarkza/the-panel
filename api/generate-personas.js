import { callGroq } from '../shared/groqClient.js';

/**
 * Vercel serverless function: POST /api/generate-personas
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

  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
  const requestedCount = Number.isInteger(req.body?.count)
    ? req.body.count
    : Number.parseInt(req.body?.count, 10);
  const personaCount = Number.isNaN(requestedCount)
    ? 5
    : Math.min(7, Math.max(3, requestedCount));

  if (!topic) {
    return res.status(400).json({ error: true, message: 'A topic string is required.' });
  }

  const systemPrompt = `You are a debate panel generator. When given a topic, you create ${personaCount} distinct, opinionated personas who will debate it.

Return ONLY a valid JSON array with exactly ${personaCount} objects. No markdown, no explanation, no extra text.

Each object must have:
- name: a believable full name
- archetype: a short label describing their worldview
- bias: a one-sentence description of their slant on the topic
- tone: one word describing their debating style`;

  const userPrompt = `Generate ${personaCount} debate personas for this topic: "${topic}"`;

  try {
    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const raw = await callGroq([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], 800);

        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('Model did not return a valid JSON array.');
        }

        const personas = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(personas) || personas.length !== personaCount) {
          throw new Error(`Expected exactly ${personaCount} personas.`);
        }

        return res.status(200).json({ personas, persona_count: personaCount });
      } catch (attemptError) {
        lastError = attemptError;
        console.warn(`[api/generate-personas] Attempt ${attempt}/${maxAttempts} failed:`, attemptError.message);
      }
    }

    throw lastError || new Error('Persona generation failed after retry.');
  } catch (err) {
    console.error('[api/generate-personas] Error:', err.message);
    return res.status(502).json({ error: true, message: 'Persona generation failed upstream.' });
  }
}
