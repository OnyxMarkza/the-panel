import { Router } from 'express';
import { callGroq } from '../lib/groq.js';

const router = Router();

/**
 * POST /api/summarise
 * Body: { topic, history }
 * Returns: { summary, verdict }
 *
 * Asks Groq to act as a neutral moderator and synthesise the debate.
 */
router.post('/summarise', async (req, res) => {
  const { topic, history } = req.body;

  if (!topic || !history) {
    return res.status(400).json({ error: true, message: 'topic and history are required.' });
  }

  const transcript = history
    .map(msg => `${msg.persona}: ${msg.content}`)
    .join('\n\n');

  const systemPrompt = `You are a neutral, senior moderator summarising a panel debate.
You have no opinion of your own. Your job is to synthesise the key arguments and tensions fairly.`;

  const userPrompt = `Topic: "${topic}"

Debate transcript:
${transcript}

Write two things:
1. SUMMARY: A neutral 3-4 sentence synthesis of the main arguments and disagreements.
2. VERDICT: One sentence stating whether there was a clear consensus, a split, or an unresolved tension.

Format your response exactly as:
SUMMARY: [your summary here]
VERDICT: [your verdict here]`;

  try {
    const raw = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 600);

    // Parse the structured response
    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?=VERDICT:|$)/i);
    const verdictMatch = raw.match(/VERDICT:\s*([\s\S]*?)$/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : raw.trim();
    const verdict = verdictMatch ? verdictMatch[1].trim() : 'No clear verdict reached.';

    res.json({ summary, verdict });
  } catch (err) {
    console.error('[summarise] Error:', err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
