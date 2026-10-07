import { Router } from 'express';
import { callGroq } from '../lib/groq.js';
import { parseDebateRoundRequest } from '../../shared/debateRoundValidation.js';

const router = Router();

router.post('/debate-round', async (req, res) => {
  const parsed = parseDebateRoundRequest(req.body);
  if (!parsed.ok) {
    return res.status(parsed.status).json(parsed.body);
  }

  const { personas, topic, roundNumber, history: updatedHistory } = parsed;

  try {
    for (let i = 0; i < personas.length; i += 1) {
      const persona = personas[i] ?? {};
      const personaName = typeof persona.name === 'string' && persona.name.trim() ? persona.name.trim() : `Panellist ${i + 1}`;

      const systemPrompt = `You are ${personaName}, a ${persona.archetype ?? 'panel expert'}.
Your position: ${persona.bias ?? 'No explicit position provided.'}
Your tone: ${persona.tone ?? 'measured'}

You are participating in a panel debate on the topic: "${topic}".
Round ${roundNumber} of 3.

Speak directly and in character. Keep your response to 2-4 sentences.
Do NOT introduce yourself — just make your point or respond to what others have said.
Do NOT use asterisks or markdown formatting.`;

      const priorMessages = updatedHistory.map((msg) => ({
        role: 'user',
        content: `${msg.persona}: ${msg.content}`,
      }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...priorMessages,
        { role: 'user', content: `It is now ${personaName}'s turn to speak.` },
      ];

      const content = await callGroq(messages, 300);
      updatedHistory.push({ persona: personaName, content: (content ?? '').trim() || '[No response generated.]' });
    }

    return res.json({ history: updatedHistory });
  } catch (err) {
    console.error('[debate] Upstream error:', err.message);
    return res.status(502).json({ error: true, code: 'UPSTREAM_ERROR', message: 'Debate round generation failed upstream.' });
  }
});

export default router;
