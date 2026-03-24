import { Router } from 'express';
import { callGroq } from '../lib/groq.js';

const router = Router();
const DEFAULT_PERSONA_COUNT = 5;
const MIN_PERSONA_COUNT = 3;
const MAX_PERSONA_COUNT = 7;

function normalizeTopic(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ');
}

function normalizeCount(input) {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isInteger(parsed)) return DEFAULT_PERSONA_COUNT;
  return Math.min(Math.max(parsed, MIN_PERSONA_COUNT), MAX_PERSONA_COUNT);
}

router.post('/generate-personas', async (req, res) => {
  const topic = normalizeTopic(req.body?.topic);
  const personaCount = normalizeCount(req.body?.count);

  if (!topic) {
    return res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'A topic string is required.' });
  }

  if (topic.length > 100) {
    return res.status(422).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'Topic must be 100 characters or less.',
    });
  }

  const systemPrompt = `You are a debate panel generator. When given a topic, you create ${personaCount} distinct panellists who could plausibly appear on a serious broadcast panel or at a professional conference.

Guidelines for realism:
- Give each panellist a concrete professional role and affiliation.
- Names should be diverse and ordinary.
- Each panellist should have a clear perspective rooted in professional experience.

Return ONLY a valid JSON array with exactly ${personaCount} objects. No markdown, no explanation, no extra text.

Each object must have:
- name: a realistic full name
- archetype: their professional title and affiliation
- bias: one sentence describing their likely stance on the topic, grounded in their role
- tone: one word for their debating style
- stance: a 1-2 sentence plain-English summary of what this person will argue
- relationships: an array of exactly ${Math.max(0, personaCount - 1)} objects, one for each other panellist, each with name and dynamic`;

  const userPrompt = `Generate ${personaCount} debate personas for this topic: "${topic}"`;

  try {
    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const raw = await callGroq([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], 2000);

        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('Model did not return a valid JSON array.');
        }

        const personas = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(personas) || personas.length !== personaCount) {
          throw new Error(`Expected exactly ${personaCount} personas.`);
        }

        const normalized = personas.map((persona, index) => {
          const fallbackName = `Panellist ${index + 1}`;
          return {
            name: typeof persona?.name === 'string' && persona.name.trim() ? persona.name.trim() : fallbackName,
            archetype: typeof persona?.archetype === 'string' ? persona.archetype.trim() : 'Panel expert',
            bias: typeof persona?.bias === 'string' ? persona.bias.trim() : 'No clear position provided.',
            tone: typeof persona?.tone === 'string' ? persona.tone.trim() : 'measured',
            stance: typeof persona?.stance === 'string' ? persona.stance.trim() : '',
            relationships: Array.isArray(persona?.relationships) ? persona.relationships : [],
          };
        });

        return res.json({ personas: normalized, persona_count: personaCount });
      } catch (attemptError) {
        lastError = attemptError;
        console.warn(`[personas] Attempt ${attempt}/${maxAttempts} failed:`, attemptError.message);
      }
    }

    throw lastError || new Error('Persona generation failed after retry.');
  } catch (err) {
    console.error('[personas] Upstream error:', err.message);
    return res.status(502).json({
      error: true,
      code: 'UPSTREAM_ERROR',
      message: 'Persona generation upstream request failed.',
    });
  }
});

export default router;
