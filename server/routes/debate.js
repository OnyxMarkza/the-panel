import { Router } from 'express';
import { callGroq } from '../lib/groq.js';

const router = Router();

/**
 * POST /api/debate-round
 * Body: { personas, history, topic, roundNumber }
 *
 * Each persona speaks sequentially. After each speaks, their message is
 * appended to the history so subsequent personas can respond to it.
 * This simulates a real, evolving debate rather than simultaneous responses.
 */
router.post('/debate-round', async (req, res) => {
  const { personas, history, topic, roundNumber } = req.body;

  if (!personas || !topic) {
    return res.status(400).json({ error: true, message: 'personas and topic are required.' });
  }

  // Work with a mutable copy of history so each persona sees prior speakers
  const updatedHistory = [...(history ?? [])];

  try {
    for (const persona of personas) {
      // Build a system prompt that gives the persona their character
      const systemPrompt = `You are ${persona.name}, a ${persona.archetype}.
Your position: ${persona.bias}
Your tone: ${persona.tone}

You are participating in a panel debate on the topic: "${topic}".
Round ${roundNumber} of 3.

Speak directly and in character. Keep your response to 2-4 sentences.
Do NOT introduce yourself — just make your point or respond to what others have said.
Do NOT use asterisks or markdown formatting.`;

      // Build conversation history as Groq messages
      // We represent prior speakers as "user" turns so the model sees them as context
      const priorMessages = updatedHistory.map(msg => ({
        role: 'user',
        content: `${msg.persona}: ${msg.content}`,
      }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...priorMessages,
        { role: 'user', content: `It is now ${persona.name}'s turn to speak.` },
      ];

      const content = await callGroq(messages, 300);

      // Append this persona's message to the running history
      updatedHistory.push({ persona: persona.name, content: content.trim() });
    }

    res.json({ history: updatedHistory });
  } catch (err) {
    console.error('[debate] Error:', err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
