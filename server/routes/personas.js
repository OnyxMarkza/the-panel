import { Router } from 'express';
import { callGroq } from '../lib/groq.js';

const router = Router();

/**
 * POST /api/generate-personas
 * Body: { topic: string }
 * Returns: Array of 5 persona objects { name, archetype, bias, tone, stance, relationships }
 *
 * We ask Groq to return a raw JSON array so we can parse it directly.
 */
router.post('/generate-personas', async (req, res) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: true, message: 'A topic string is required.' });
  }

  // Validate topic length (max 100 characters)
  if (topic.length > 100) {
    return res.status(400).json({ error: true, message: 'Topic must be 100 characters or less.' });
  }

  // Validate topic is not empty after trimming
  if (!topic.trim()) {
    return res.status(400).json({ error: true, message: 'Topic cannot be empty or only whitespace.' });
  }

  const systemPrompt = `You are a debate panel generator. When given a topic, you create 5 distinct panellists who could plausibly appear on a serious broadcast panel or at a professional conference.

Guidelines for realism:
- Give each panellist a concrete professional role and affiliation (e.g. "Consultant cardiologist, King's College Hospital" or "Senior policy analyst, WHO"). Avoid vague labels like "Tech visionary" or "Patient advocate".
- Names should be diverse and ordinary — the kind you'd see on a conference programme, not a novel.
- Each panellist should have a clear perspective rooted in their professional experience, not a caricature.
- Tones should reflect how real professionals actually argue: some are blunt, some are careful with data, some use dry humour. Avoid melodramatic descriptors.

Return ONLY a valid JSON array with exactly 5 objects. No markdown, no explanation, no extra text.

Each object must have:
- name: a realistic full name
- archetype: their professional title and affiliation (e.g. "Health economist, London School of Hygiene & Tropical Medicine")
- bias: one sentence describing their likely stance on the topic, grounded in their role
- tone: one word for their debating style (e.g. "direct", "cautious", "dry", "forceful", "analytical")
- stance: a 1-2 sentence plain-English summary of what this person will argue (written as "Argues that..." or "Will push for...")
- relationships: an array of exactly 4 objects, one for each OTHER panellist, each with:
    - name: the other panellist's name
    - dynamic: one short sentence describing how these two are likely to interact (e.g. "Will challenge her cost-cutting assumptions" or "Likely allies on the need for regulation")`;

  const userPrompt = `Generate 5 debate personas for this topic: "${topic}"`;

  try {
    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const raw = await callGroq([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], 2000);

        // Extract JSON array from the response (handles wrapped output)
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('Model did not return a valid JSON array.');
        }

        const personas = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(personas) || personas.length !== 5) {
          throw new Error('Expected exactly 5 personas.');
        }

        // Validate each persona object has required fields
        for (let i = 0; i < personas.length; i++) {
          const persona = personas[i];
          if (!persona.name || !persona.archetype || !persona.bias || !persona.tone) {
            throw new Error(`Persona ${i + 1} is missing required fields (name, archetype, bias, tone).`);
          }
          if (typeof persona.name !== 'string' || typeof persona.archetype !== 'string' ||
              typeof persona.bias !== 'string' || typeof persona.tone !== 'string') {
            throw new Error(`Persona ${i + 1} has invalid field types. All fields must be strings.`);
          }
        }

        return res.json({ personas });
      } catch (attemptError) {
        lastError = attemptError;
        console.warn(`[personas] Attempt ${attempt}/${maxAttempts} failed:`, attemptError.message);
      }
    }

    throw lastError || new Error('Persona generation failed after retry.');
  } catch (err) {
    console.error('[personas] Error:', err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
