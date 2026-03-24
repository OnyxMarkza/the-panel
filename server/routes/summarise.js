import { Router } from 'express';
import { callGroq } from '../lib/groq.js';

const router = Router();

router.post('/summarise', async (req, res) => {
  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!topic) {
    return res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'topic is required.' });
  }

  if (history.length === 0) {
    return res.status(422).json({ error: true, code: 'VALIDATION_ERROR', message: 'history must include at least one message.' });
  }

  const transcript = history
    .filter((msg) => msg && typeof msg === 'object')
    .map((msg, i) => `${msg.persona || `Panellist ${i + 1}`}: ${msg.content || ''}`)
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

    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?=VERDICT:|$)/i);
    const verdictMatch = raw.match(/VERDICT:\s*([\s\S]*?)$/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : raw.trim();
    const verdict = verdictMatch ? verdictMatch[1].trim() : 'No clear verdict reached.';

    return res.json({ summary, verdict });
  } catch (err) {
    console.error('[summarise] Upstream error:', err.message);
    return res.status(502).json({ error: true, code: 'UPSTREAM_ERROR', message: 'Summary generation failed upstream.' });
  }
});

export default router;
