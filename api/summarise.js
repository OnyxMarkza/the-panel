import { callGroq } from '../shared/groqClient.js';

/**
 * Vercel serverless function: POST /api/summarise
 *
 * Mirrors the logic in server/routes/summarise.js.
 * Asks Groq to act as a neutral moderator and synthesise the debate.
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

    return res.status(200).json({ summary, verdict });
  } catch (err) {
    console.error('[api/summarise] Error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
}
