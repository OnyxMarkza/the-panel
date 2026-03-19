import { callGroq } from '../shared/groqClient.js';

/**
 * Vercel serverless function: POST /api/debate-round
 *
 * Mirrors the logic in server/routes/debate.js.
 * Each persona speaks sequentially, seeing all prior messages in the round.
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

  const { personas, history, topic, roundNumber } = req.body;

  if (!personas || !topic) {
    return res.status(400).json({ error: true, message: 'personas and topic are required.' });
  }

  // Work with a mutable copy so each persona sees what the previous ones said
  const updatedHistory = [...(history ?? [])];

  try {
    for (const persona of personas) {
      const systemPrompt = `You are ${persona.name}, a ${persona.archetype}.
Your position: ${persona.bias}
Your tone: ${persona.tone}

You are participating in a panel debate on the topic: "${topic}".
Round ${roundNumber} of 3.

Speak directly and in character. Keep your response to 2-4 sentences.
Do NOT introduce yourself — just make your point or respond to what others have said.
Do NOT use asterisks or markdown formatting.`;

      // Represent prior speakers as 'user' turns so the model treats them as context
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
      updatedHistory.push({ persona: persona.name, content: content.trim() });
    }

    return res.status(200).json({ history: updatedHistory });
  } catch (err) {
    console.error('[api/debate-round] Error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
}
