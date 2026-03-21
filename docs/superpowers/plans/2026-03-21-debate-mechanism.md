# Debate Mechanism Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 5-persona, 3-round debate engine with a configurable 3–10 person, phase-aware system with direct rebuttals, user interventions, and richer personas.

**Architecture:** Pure utility functions are extracted to `shared/debateUtils.js` and tested in isolation. The backend endpoints gain a `phase` parameter and intervention injection. The frontend gains a panel size picker, a phase-aware state machine, and an `InterventionPanel` that pauses between phases for optional user input.

**Tech Stack:** React 18, Vite 5, Express 4, Groq SDK (llama-3.3-70b-versatile), Vitest (new — unit tests for backend utilities)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `shared/debateUtils.js` | **Create** | Three pure functions: phase prompt builder, intervention injector, relationship symmetry validator |
| `tests/debateUtils.test.js` | **Create** | Unit tests for all three utilities |
| `vitest.config.js` | **Create** | Vitest configuration (node environment, ES module support) |
| `api/generate-personas.js` | **Modify** | Add `count` param, new schema with `background` + `relationships`, token limit 1200, symmetry retry |
| `server/routes/personas.js` | **Modify** | Same as above (kept in sync) |
| `api/debate-round.js` | **Modify** | Add `phase` + `interventions` params, phase-aware prompts via `buildPhaseSystemPrompt`, inject interventions via `injectInterventions`, add `phase` field to all history entries |
| `server/routes/debate.js` | **Modify** | Same as above (kept in sync) |
| `api/summarise.js` | **Modify** | Filter `Audience` entries before building the transcript |
| `server/routes/summarise.js` | **Modify** | Same as above (kept in sync) |
| `client/src/index.css` | **Modify** | Add `--persona-5` through `--persona-9` |
| `client/src/components/PersonaCard.jsx` | **Modify** | Render `background` field beneath archetype |
| `client/src/components/TopicInput.jsx` | **Modify** | Add panel size picker (3–10, default 5); change `onSubmit(topic)` to `onSubmit(topic, count)` |
| `client/src/components/DebateThread.jsx` | **Modify** | Expand `PERSONA_COLOURS` to 10 entries; add phase-boundary headers; style Audience entries distinctly; update prop signature |
| `client/src/components/InterventionPanel.jsx` | **Create** | Tabbed UI — Audience Question tab + Direct Challenge tab, mutually exclusive, Skip button |
| `client/src/App.jsx` | **Modify** | New `currentPhase` + `panelCount` state; intervention pause/resume using a Promise ref; three-phase orchestration loop replacing the three-round loop |

---

## Task 1: Install Vitest and create test infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest
```

Expected: Vitest appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` section of `package.json`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.js` at project root**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run in Node.js — no browser DOM needed for backend utility tests
    environment: 'node',
  },
});
```

- [ ] **Step 4: Verify Vitest works**

```bash
npm test
```

Expected output: `No test files found` (or similar — no failures, just nothing to run yet).

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.js
git commit -m "chore: add Vitest for backend unit tests"
```

---

## Task 2: Extract shared debate utilities

**Files:**
- Create: `shared/debateUtils.js`
- Create: `tests/debateUtils.test.js`

These are **pure functions** — they take inputs and return outputs with no side effects. Extracting them here lets us test the most complex logic (prompts, injection, validation) without needing a running server or a live LLM.

- [ ] **Step 1: Write the failing tests first**

Create `tests/debateUtils.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  buildPhaseSystemPrompt,
  injectInterventions,
  validateRelationshipSymmetry,
} from '../shared/debateUtils.js';

// A minimal persona to use across tests
const basePersona = {
  name: 'Dr. Amara Osei',
  archetype: 'Public health pragmatist',
  bias: 'Believes incremental policy beats radical disruption',
  tone: 'measured',
  background: 'Former WHO regional director',
  relationships: [{ name: 'Marcus Webb', dynamic: 'rival' }],
};

// ---------- buildPhaseSystemPrompt ----------

describe('buildPhaseSystemPrompt', () => {
  it('includes the persona name and background', () => {
    const prompt = buildPhaseSystemPrompt(basePersona, 'AI in healthcare', 'opening');
    expect(prompt).toContain('Dr. Amara Osei');
    expect(prompt).toContain('Former WHO regional director');
  });

  it('uses the opening instruction for opening phase', () => {
    const prompt = buildPhaseSystemPrompt(basePersona, 'AI in healthcare', 'opening');
    expect(prompt).toContain('opening argument');
  });

  it('uses the rebuttal instruction for rebuttal phase', () => {
    const prompt = buildPhaseSystemPrompt(basePersona, 'AI in healthcare', 'rebuttal');
    expect(prompt).toContain('Address one specific person');
  });

  it('uses the closing instruction for closing phase', () => {
    const prompt = buildPhaseSystemPrompt(basePersona, 'AI in healthcare', 'closing');
    expect(prompt).toContain('closing argument');
  });

  it('includes relationship data in the prompt', () => {
    const prompt = buildPhaseSystemPrompt(basePersona, 'AI in healthcare', 'rebuttal');
    expect(prompt).toContain('Marcus Webb');
    expect(prompt).toContain('rival');
  });
});

// ---------- injectInterventions ----------

describe('injectInterventions', () => {
  const history = [{ persona: 'Dr. Amara Osei', content: 'Hello.', phase: 'opening' }];

  it('returns unchanged history when interventions array is empty', () => {
    const result = injectInterventions(history, []);
    expect(result).toEqual(history);
  });

  it('does not mutate the original history array', () => {
    injectInterventions(history, [{ type: 'question', content: 'What about cost?' }]);
    expect(history).toHaveLength(1);
  });

  it('injects an audience question with persona "Audience"', () => {
    const result = injectInterventions(history, [
      { type: 'question', content: 'What about cost?' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[1].persona).toBe('Audience');
    expect(result[1].content).toBe('What about cost?');
    expect(result[1].phase).toBe('audience');
  });

  it('injects a direct challenge with "Audience → [name]" format', () => {
    const result = injectInterventions(history, [
      { type: 'challenge', targetPersona: 'Marcus Webb', content: 'Your evidence is outdated.' },
    ]);
    expect(result[1].persona).toBe('Audience → Marcus Webb');
    expect(result[1].phase).toBe('audience');
  });
});

// ---------- validateRelationshipSymmetry ----------

describe('validateRelationshipSymmetry', () => {
  it('passes for a symmetric two-persona web', () => {
    const personas = [
      { name: 'A', relationships: [{ name: 'B', dynamic: 'rival' }] },
      { name: 'B', relationships: [{ name: 'A', dynamic: 'rival' }] },
    ];
    expect(validateRelationshipSymmetry(personas)).toBe(true);
  });

  it('throws when a referenced persona does not exist', () => {
    const personas = [
      { name: 'A', relationships: [{ name: 'C', dynamic: 'ally' }] },
    ];
    expect(() => validateRelationshipSymmetry(personas)).toThrow('"C"');
  });

  it('throws when the reciprocal relationship is missing', () => {
    const personas = [
      { name: 'A', relationships: [{ name: 'B', dynamic: 'rival' }] },
      { name: 'B', relationships: [] },
    ];
    expect(() => validateRelationshipSymmetry(personas)).toThrow('asymmetry');
  });

  it('passes for personas with empty relationship arrays', () => {
    const personas = [
      { name: 'A', relationships: [] },
      { name: 'B', relationships: [] },
    ];
    expect(validateRelationshipSymmetry(personas)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — confirm they all fail**

```bash
npm test
```

Expected: All tests fail with `Cannot find module '../shared/debateUtils.js'`.

- [ ] **Step 3: Implement `shared/debateUtils.js`**

```js
/**
 * debateUtils.js — Pure utility functions for the debate engine.
 *
 * These functions have no side effects and no imports (no LLM calls, no I/O).
 * That makes them easy to unit test and easy to reason about.
 */

/**
 * Build the system prompt for a persona given the current debate phase.
 *
 * The phase controls what kind of speech the model produces:
 *   - opening:  stake a position, no reactions yet
 *   - rebuttal: directly challenge a specific person by name
 *   - closing:  defend your position, optionally acknowledge shifts
 *
 * Relationship data is included so the model knows who to target in rebuttals.
 *
 * @param {object} persona - The persona object (name, archetype, bias, tone, background, relationships)
 * @param {string} topic - The debate topic
 * @param {'opening'|'rebuttal'|'closing'} phase - The current debate phase
 * @returns {string} The system prompt string
 */
export function buildPhaseSystemPrompt(persona, topic, phase) {
  const phaseInstructions = {
    opening:
      'Make your opening argument. Do not respond to others yet — stake your position clearly.',
    rebuttal:
      'Address one specific person from the prior discussion by name. Disagree or push back directly on their argument. Use relationship context below to decide who to challenge.',
    closing:
      'Give your closing argument. You may acknowledge where you shifted, but defend your core position.',
  };

  const relationshipLines =
    persona.relationships?.map(r => `  - ${r.name}: ${r.dynamic}`).join('\n') ?? '';

  return `You are ${persona.name}, a ${persona.archetype}.
Your background: ${persona.background ?? 'Not specified'}
Your position: ${persona.bias}
Your tone: ${persona.tone}
${
  relationshipLines
    ? `\nYour relationships with other panellists:\n${relationshipLines}\n`
    : ''
}
You are participating in a panel debate on the topic: "${topic}".

${phaseInstructions[phase]}

Speak directly and in character. Keep your response to 2-4 sentences.
Do NOT introduce yourself — just make your point or respond to what others have said.
Do NOT use asterisks or markdown formatting.`;
}

/**
 * Convert an interventions array into history entries and prepend them
 * to the running history before persona turns.
 *
 * Does NOT mutate the input array.
 *
 * @param {Array<object>} history - The current debate history
 * @param {Array<{type: string, targetPersona: string|null, content: string}>} interventions
 * @returns {Array<object>} A new history array with interventions prepended
 */
export function injectInterventions(history, interventions) {
  if (!interventions || interventions.length === 0) return [...history];

  const entries = interventions.map(intervention => ({
    // Direct challenges name the target; general questions use plain "Audience"
    persona:
      intervention.type === 'challenge' && intervention.targetPersona
        ? `Audience → ${intervention.targetPersona}`
        : 'Audience',
    content: intervention.content,
    phase: 'audience',
  }));

  return [...history, ...entries];
}

/**
 * Verify that every relationship in the personas array is symmetric.
 * If A lists B as "rival", B must list A with any dynamic.
 *
 * Throws a descriptive Error on the first violation found.
 * Returns true if the web is valid.
 *
 * @param {Array<object>} personas - The full array of persona objects
 * @returns {true}
 */
export function validateRelationshipSymmetry(personas) {
  for (const persona of personas) {
    for (const rel of persona.relationships ?? []) {
      const other = personas.find(p => p.name === rel.name);

      if (!other) {
        throw new Error(
          `Persona "${persona.name}" references "${rel.name}" in relationships, but no persona with that name exists.`
        );
      }

      const reciprocal = other.relationships?.find(r => r.name === persona.name);
      if (!reciprocal) {
        throw new Error(
          `Relationship asymmetry: "${persona.name}" lists "${rel.name}" as ${rel.dynamic}, but "${rel.name}" has no entry for "${persona.name}".`
        );
      }
    }
  }

  return true;
}
```

- [ ] **Step 4: Run tests — confirm they all pass**

```bash
npm test
```

Expected: All 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add shared/debateUtils.js tests/debateUtils.test.js vitest.config.js package.json
git commit -m "feat: extract debate utilities with unit tests (prompt builder, intervention injector, symmetry validator)"
```

---

## Task 3: Extend the CSS colour system

**Files:**
- Modify: `client/src/index.css`

The current file has `--persona-0` through `--persona-4`. We need five more for panels of up to 10.

- [ ] **Step 1: Add the five new CSS variables**

In `client/src/index.css`, directly after `--persona-4: #a8c47a;`, add:

```css
--persona-5: #c49fd4; /* lavender */
--persona-6: #d49f7c; /* terracotta */
--persona-7: #7cd4b8; /* seafoam */
--persona-8: #d4c47a; /* straw */
--persona-9: #7c9fd4; /* steel blue */
```

- [ ] **Step 2: Verify visually**

Start the dev server (`npm run dev`) and temporarily add a `PersonaCard` with `index={6}` in the browser console or by editing `App.jsx`. Confirm the new colour appears. Undo that change.

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "feat: add persona colour variables 5-9 for larger panels"
```

---

## Task 4: Update the persona generation endpoints

**Files:**
- Modify: `api/generate-personas.js`
- Modify: `server/routes/personas.js`

Both files are kept identical in logic. After editing one, apply the same changes to the other.

- [ ] **Step 1: Update `api/generate-personas.js`**

Replace the entire file with:

```js
import { callGroq } from '../shared/groqClient.js';
import { validateRelationshipSymmetry } from '../shared/debateUtils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  const { topic, count: rawCount } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: true, message: 'A topic string is required.' });
  }
  if (!topic.trim()) {
    return res.status(400).json({ error: true, message: 'Topic cannot be empty.' });
  }
  if (topic.length > 100) {
    return res.status(400).json({ error: true, message: 'Topic must be 100 characters or less.' });
  }

  // count defaults to 5 if omitted; clamped to valid range
  const count = Math.min(Math.max(parseInt(rawCount, 10) || 5, 3), 10);

  const systemPrompt = `You are a debate panel generator. When given a topic, you create ${count} distinct, opinionated personas who will debate it.

Return ONLY a valid JSON array with exactly ${count} objects. No markdown, no explanation, no extra text.

Each object must have:
- name: a believable full name
- archetype: a short label describing their worldview (e.g. "Techno-optimist", "Sceptical journalist")
- bias: a one-sentence description of their slant on the topic
- tone: one word describing their debating style (e.g. "combative", "measured", "sardonic")
- background: a short professional credential (e.g. "Former WHO regional director", "Tech startup founder")
- relationships: an array with exactly ${count - 1} entries — one per other panellist — each with:
    - name: that panellist's exact full name (must match another persona's name field)
    - dynamic: one of "ally", "rival", or "neutral"

CRITICAL: Relationships must be symmetric. If persona A lists persona B as "rival", persona B must list persona A as "rival". Check every pair before returning.`;

  const userPrompt = `Generate ${count} debate personas for this topic: "${topic}"`;

  // We allow one retry if the LLM returns an asymmetric relationship web
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        1200 // increased from 800 to handle larger panels + richer schema
      );

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Model did not return a valid JSON array.');

      let personas;
      try {
        personas = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Model returned invalid JSON.');
      }

      if (!Array.isArray(personas) || personas.length !== count) {
        throw new Error(`Expected exactly ${count} personas.`);
      }

      // Validate all required fields
      for (let i = 0; i < personas.length; i++) {
        const p = personas[i];
        const required = ['name', 'archetype', 'bias', 'tone', 'background', 'relationships'];
        for (const field of required) {
          if (!p[field] && p[field] !== '') {
            throw new Error(`Persona ${i + 1} is missing field: ${field}`);
          }
        }
        if (!Array.isArray(p.relationships)) {
          throw new Error(`Persona ${i + 1} relationships must be an array.`);
        }
      }

      // Validate relationship symmetry — retry once on failure
      try {
        validateRelationshipSymmetry(personas);
      } catch (symmetryError) {
        if (attempt === 0) {
          // First attempt failed — try again
          console.warn('[generate-personas] Asymmetric relationships, retrying...', symmetryError.message);
          continue;
        }
        // Second attempt also failed — give up
        throw new Error(`Relationship symmetry invalid after 2 attempts: ${symmetryError.message}`);
      }

      return res.status(200).json({ personas });
    } catch (err) {
      if (attempt === 0 && err.message.includes('Relationship symmetry')) {
        continue; // already handled above via the symmetry retry
      }
      console.error('[api/generate-personas] Error:', err.message);
      return res.status(500).json({ error: true, message: err.message });
    }
  }
}
```

- [ ] **Step 2: Apply the same changes to `server/routes/personas.js`**

Replace the route handler body with identical logic, keeping the Express router wrapper:

```js
import { Router } from 'express';
import { callGroq } from '../lib/groq.js';
import { validateRelationshipSymmetry } from '../../shared/debateUtils.js';

const router = Router();

router.post('/generate-personas', async (req, res) => {
  const { topic, count: rawCount } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: true, message: 'A topic string is required.' });
  }
  if (!topic.trim()) {
    return res.status(400).json({ error: true, message: 'Topic cannot be empty.' });
  }
  if (topic.length > 100) {
    return res.status(400).json({ error: true, message: 'Topic must be 100 characters or less.' });
  }

  const count = Math.min(Math.max(parseInt(rawCount, 10) || 5, 3), 10);

  const systemPrompt = `You are a debate panel generator. When given a topic, you create ${count} distinct, opinionated personas who will debate it.

Return ONLY a valid JSON array with exactly ${count} objects. No markdown, no explanation, no extra text.

Each object must have:
- name: a believable full name
- archetype: a short label describing their worldview (e.g. "Techno-optimist", "Sceptical journalist")
- bias: a one-sentence description of their slant on the topic
- tone: one word describing their debating style (e.g. "combative", "measured", "sardonic")
- background: a short professional credential (e.g. "Former WHO regional director", "Tech startup founder")
- relationships: an array with exactly ${count - 1} entries — one per other panellist — each with:
    - name: that panellist's exact full name (must match another persona's name field)
    - dynamic: one of "ally", "rival", or "neutral"

CRITICAL: Relationships must be symmetric. If persona A lists persona B as "rival", persona B must list persona A as "rival". Check every pair before returning.`;

  const userPrompt = `Generate ${count} debate personas for this topic: "${topic}"`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        1200
      );

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Model did not return a valid JSON array.');

      let personas;
      try {
        personas = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Model returned invalid JSON.');
      }

      if (!Array.isArray(personas) || personas.length !== count) {
        throw new Error(`Expected exactly ${count} personas.`);
      }

      for (let i = 0; i < personas.length; i++) {
        const p = personas[i];
        const required = ['name', 'archetype', 'bias', 'tone', 'background', 'relationships'];
        for (const field of required) {
          if (!p[field] && p[field] !== '') {
            throw new Error(`Persona ${i + 1} is missing field: ${field}`);
          }
        }
        if (!Array.isArray(p.relationships)) {
          throw new Error(`Persona ${i + 1} relationships must be an array.`);
        }
      }

      try {
        validateRelationshipSymmetry(personas);
      } catch (symmetryError) {
        if (attempt === 0) {
          console.warn('[personas] Asymmetric relationships, retrying...', symmetryError.message);
          continue;
        }
        throw new Error(`Relationship symmetry invalid after 2 attempts: ${symmetryError.message}`);
      }

      return res.json({ personas });
    } catch (err) {
      if (attempt === 0 && err.message.includes('Relationship symmetry')) continue;
      console.error('[personas] Error:', err.message);
      return res.status(500).json({ error: true, message: err.message });
    }
  }
});

export default router;
```

- [ ] **Step 3: Run the unit tests to confirm nothing broke**

```bash
npm test
```

Expected: All 12 tests still pass.

- [ ] **Step 4: Commit**

```bash
git add api/generate-personas.js server/routes/personas.js
git commit -m "feat: update generate-personas — configurable count, richer schema, symmetry validation"
```

---

## Task 5: Update the debate-round endpoints

**Files:**
- Modify: `api/debate-round.js`
- Modify: `server/routes/debate.js`

- [ ] **Step 1: Replace `api/debate-round.js`**

```js
import { callGroq } from '../shared/groqClient.js';
import { buildPhaseSystemPrompt, injectInterventions } from '../shared/debateUtils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  const { personas, history, topic, phase, interventions = [] } = req.body;

  if (!personas || !topic || !phase) {
    return res.status(400).json({ error: true, message: 'personas, topic, and phase are required.' });
  }

  const validPhases = ['opening', 'rebuttal', 'closing'];
  if (!validPhases.includes(phase)) {
    return res.status(400).json({ error: true, message: `phase must be one of: ${validPhases.join(', ')}` });
  }

  // Inject any audience interventions before persona turns begin
  // injectInterventions returns a new array and does not mutate the input
  let updatedHistory = injectInterventions(history ?? [], interventions);

  try {
    for (const persona of personas) {
      // Build a phase-aware system prompt using the shared utility
      const systemPrompt = buildPhaseSystemPrompt(persona, topic, phase);

      // If this is a direct challenge targeting this persona specifically,
      // add an extra instruction so the model knows it's being addressed
      const isTargeted = interventions.some(
        inv => inv.type === 'challenge' && inv.targetPersona === persona.name
      );
      const targetedNote = isTargeted
        ? '\n\nNote: The audience has directed a question specifically at you. Address it directly in your response.'
        : '';

      // All prior messages are represented as 'user' turns so the model sees them as context
      const priorMessages = updatedHistory.map(msg => ({
        role: 'user',
        content: `${msg.persona}: ${msg.content}`,
      }));

      const messages = [
        { role: 'system', content: systemPrompt + targetedNote },
        ...priorMessages,
        { role: 'user', content: `It is now ${persona.name}'s turn to speak.` },
      ];

      const content = await callGroq(messages, 300);

      // Each history entry carries the phase so the frontend can render phase headers
      updatedHistory.push({ persona: persona.name, content: content.trim(), phase });
    }

    return res.status(200).json({ history: updatedHistory });
  } catch (err) {
    console.error('[api/debate-round] Error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
}
```

- [ ] **Step 2: Apply the same logic to `server/routes/debate.js`**

```js
import { Router } from 'express';
import { callGroq } from '../lib/groq.js';
import { buildPhaseSystemPrompt, injectInterventions } from '../../shared/debateUtils.js';

const router = Router();

router.post('/debate-round', async (req, res) => {
  const { personas, history, topic, phase, interventions = [] } = req.body;

  if (!personas || !topic || !phase) {
    return res.status(400).json({ error: true, message: 'personas, topic, and phase are required.' });
  }

  const validPhases = ['opening', 'rebuttal', 'closing'];
  if (!validPhases.includes(phase)) {
    return res.status(400).json({ error: true, message: `phase must be one of: ${validPhases.join(', ')}` });
  }

  let updatedHistory = injectInterventions(history ?? [], interventions);

  try {
    for (const persona of personas) {
      const systemPrompt = buildPhaseSystemPrompt(persona, topic, phase);

      const isTargeted = interventions.some(
        inv => inv.type === 'challenge' && inv.targetPersona === persona.name
      );
      const targetedNote = isTargeted
        ? '\n\nNote: The audience has directed a question specifically at you. Address it directly in your response.'
        : '';

      const priorMessages = updatedHistory.map(msg => ({
        role: 'user',
        content: `${msg.persona}: ${msg.content}`,
      }));

      const messages = [
        { role: 'system', content: systemPrompt + targetedNote },
        ...priorMessages,
        { role: 'user', content: `It is now ${persona.name}'s turn to speak.` },
      ];

      const content = await callGroq(messages, 300);
      updatedHistory.push({ persona: persona.name, content: content.trim(), phase });
    }

    res.json({ history: updatedHistory });
  } catch (err) {
    console.error('[debate] Error:', err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Run the unit tests**

```bash
npm test
```

Expected: All 12 tests still pass.

- [ ] **Step 4: Commit**

```bash
git add api/debate-round.js server/routes/debate.js
git commit -m "feat: update debate-round — phase-aware prompts, intervention injection, phase field on history entries"
```

---

## Task 6: Update the summarise endpoints

**Files:**
- Modify: `api/summarise.js`
- Modify: `server/routes/summarise.js`

Audience entries now appear in the history. The summarise endpoint should exclude them when building the transcript — they are meta-interventions, not contributions to the debate arguments.

- [ ] **Step 1: Update `api/summarise.js`**

In the transcript-building section, add a filter. Replace:

```js
const transcript = history
  .map(msg => `${msg.persona}: ${msg.content}`)
  .join('\n\n');
```

With:

```js
// Exclude Audience entries — they are user interventions, not panellist arguments
const transcript = history
  .filter(msg => !msg.persona.startsWith('Audience'))
  .map(msg => `${msg.persona}: ${msg.content}`)
  .join('\n\n');
```

- [ ] **Step 2: Apply the same change to `server/routes/summarise.js`**

Same one-line filter in the identical position.

- [ ] **Step 3: Commit**

```bash
git add api/summarise.js server/routes/summarise.js
git commit -m "fix: filter Audience entries from summarise transcript"
```

---

## Task 7: Add `background` field to PersonaCard

**Files:**
- Modify: `client/src/components/PersonaCard.jsx`

- [ ] **Step 1: Add a `background` line to the card markup**

In `PersonaCard.jsx`, between the `archetype` and `bias` divs, add:

```jsx
<div style={styles.archetype}>{persona.archetype}</div>

{/* Background credential — new field */}
{persona.background && (
  <div style={styles.background}>{persona.background}</div>
)}

<div style={styles.bias}>{persona.bias}</div>
```

- [ ] **Step 2: Add the background style**

In the `styles` object at the bottom of `PersonaCard.jsx`, add after `archetype`:

```js
background: {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
  lineHeight: '1.4',
  marginTop: '0.1rem',
},
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`. Generate personas on a topic. Confirm each card now shows the background credential beneath the archetype label.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/PersonaCard.jsx
git commit -m "feat: display persona background credential on PersonaCard"
```

---

## Task 8: Add panel size picker to TopicInput

**Files:**
- Modify: `client/src/components/TopicInput.jsx`

The panel size picker lets the user choose 3–10 panellists. It sits below the topic input, before the submit button.

Note: `onSubmit` currently calls `onSubmit(topic)`. After this task it calls `onSubmit(topic, panelCount)`. `App.jsx` will be updated in Task 11 to receive both arguments.

- [ ] **Step 1: Add `panelCount` state and picker UI**

At the top of the component, add a new state variable after the existing ones:

```js
const [panelCount, setPanelCount] = useState(5);
```

- [ ] **Step 2: Update the `handleSubmit` function**

Change:
```js
onSubmit(topic.trim());
```
To:
```js
onSubmit(topic.trim(), panelCount);
```

- [ ] **Step 3: Update the subtitle text**

Change the subtitle paragraph from:
```jsx
Enter a topic. Five minds will convene. The debate begins.
```
To:
```jsx
Enter a topic. Assemble your panel. The debate begins.
```

- [ ] **Step 4: Add the picker to the form JSX**

Inside the `<form>`, between the `inputWrapper` div and the `<button>`, add:

```jsx
{/* Panel size picker */}
<div style={styles.pickerRow}>
  <label style={styles.pickerLabel} htmlFor="panel-count">
    Panellists
  </label>
  <div style={styles.pickerControls}>
    {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
      <button
        key={n}
        type="button"
        onClick={() => setPanelCount(n)}
        style={{
          ...styles.pickerBtn,
          background: panelCount === n ? 'var(--gold)' : 'transparent',
          color: panelCount === n ? '#1a1a1a' : 'var(--text-muted)',
          borderColor: panelCount === n ? 'var(--gold)' : 'var(--border)',
        }}
      >
        {n}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 5: Add picker styles**

In the `styles` object, add:

```js
pickerRow: {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
  marginTop: 'var(--spacing-xs)',
},
pickerLabel: {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.58rem',
  letterSpacing: '0.2em',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
},
pickerControls: {
  display: 'flex',
  gap: '4px',
},
pickerBtn: {
  width: '28px',
  height: '28px',
  border: '1px solid',
  borderRadius: '3px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.68rem',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
},
```

- [ ] **Step 6: Verify manually**

Run `npm run dev`. Confirm the picker appears, selected number highlights in gold, and the selected count persists through interactions.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/TopicInput.jsx
git commit -m "feat: add configurable panel size picker to TopicInput (3-10 panellists)"
```

---

## Task 9: Build the InterventionPanel component

**Files:**
- Create: `client/src/components/InterventionPanel.jsx`

This component renders between debate phases. It has two mutually exclusive tabs (Question / Challenge). The user submits one or clicks Skip.

The parent (`App.jsx`) passes an `onResolve` callback. When the user submits, `onResolve` is called with `{ type, targetPersona, content }`. When they skip, `onResolve(null)` is called.

- [ ] **Step 1: Create the component**

```jsx
import React, { useState } from 'react';

/**
 * InterventionPanel — Appears between debate phases.
 *
 * The user can:
 *   a) Ask an audience question (goes to all panellists)
 *   b) Direct a challenge at a specific panellist
 *   c) Skip — the next phase starts with no intervention
 *
 * The two tabs are mutually exclusive — switching clears the other tab's input.
 * onResolve is called with an intervention object or null (skip).
 *
 * Props:
 *   personas   — array of persona objects (to populate the challenge dropdown)
 *   phaseFrom  — the phase just completed (e.g. 'opening')
 *   phaseTo    — the phase about to begin (e.g. 'rebuttal')
 *   onResolve  — callback: (intervention | null) => void
 */
export default function InterventionPanel({ personas, phaseFrom, phaseTo, onResolve }) {
  const [activeTab, setActiveTab] = useState('question'); // 'question' | 'challenge'
  const [questionText, setQuestionText] = useState('');
  const [challengeText, setChallengeText] = useState('');
  const [targetPersona, setTargetPersona] = useState(personas[0]?.name ?? '');

  // Human-readable phase label for the UI
  const PHASE_LABELS = {
    opening:  'Opening Statements',
    rebuttal: 'Rebuttal Round',
    closing:  'Closing Arguments',
  };

  function handleTabSwitch(tab) {
    // Switching tabs clears the other tab's input to enforce mutual exclusivity
    if (tab === 'question') setChallengeText('');
    if (tab === 'challenge') setQuestionText('');
    setActiveTab(tab);
  }

  function handleSubmit() {
    if (activeTab === 'question' && questionText.trim()) {
      onResolve({ type: 'question', targetPersona: null, content: questionText.trim() });
    } else if (activeTab === 'challenge' && challengeText.trim()) {
      onResolve({ type: 'challenge', targetPersona, content: challengeText.trim() });
    }
  }

  const canSubmit =
    (activeTab === 'question' && questionText.trim().length > 0) ||
    (activeTab === 'challenge' && challengeText.trim().length > 0);

  return (
    <div style={styles.wrapper}>
      {/* Phase transition label */}
      <div style={styles.transition}>
        <span style={styles.phaseTag}>{PHASE_LABELS[phaseFrom] ?? phaseFrom}</span>
        <span style={styles.arrow}> → </span>
        <span style={styles.phaseTag}>{PHASE_LABELS[phaseTo] ?? phaseTo}</span>
      </div>

      <h3 style={styles.heading}>Your turn to intervene</h3>
      <p style={styles.subheading}>
        Put a question to the floor, or challenge a specific panellist directly.
      </p>

      {/* Tab switcher */}
      <div style={styles.tabs}>
        {['question', 'challenge'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabSwitch(tab)}
            style={{
              ...styles.tab,
              borderBottomColor: activeTab === tab ? 'var(--gold)' : 'transparent',
              color: activeTab === tab ? 'var(--gold)' : 'var(--text-muted)',
            }}
          >
            {tab === 'question' ? 'Audience Question' : 'Direct Challenge'}
          </button>
        ))}
      </div>

      {/* Question tab */}
      {activeTab === 'question' && (
        <div style={styles.tabContent}>
          <p style={styles.hint}>Your question will be addressed by all panellists.</p>
          <textarea
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            placeholder="e.g. But what about the long-term economic cost?"
            style={styles.textarea}
            rows={3}
          />
        </div>
      )}

      {/* Challenge tab */}
      {activeTab === 'challenge' && (
        <div style={styles.tabContent}>
          <p style={styles.hint}>Your challenge will be addressed by the targeted panellist only.</p>
          <div style={styles.challengeRow}>
            <select
              value={targetPersona}
              onChange={e => setTargetPersona(e.target.value)}
              style={styles.select}
            >
              {personas.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <textarea
            value={challengeText}
            onChange={e => setChallengeText(e.target.value)}
            placeholder="e.g. Your evidence is ten years out of date."
            style={styles.textarea}
            rows={3}
          />
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          type="button"
          onClick={() => onResolve(null)}
          style={styles.skipBtn}
        >
          Skip →
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            ...styles.submitBtn,
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: 'var(--spacing-lg)',
    background: 'var(--gradient-card)',
    animation: 'fadeInUp 0.35s var(--ease-out) both',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
    maxWidth: '640px',
    margin: 'var(--spacing-lg) 0',
  },
  transition: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  arrow: {
    color: 'var(--gold)',
    opacity: 0.6,
  },
  phaseTag: {
    color: 'var(--text-muted)',
  },
  heading: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem',
    color: 'var(--gold)',
    fontWeight: '400',
  },
  subheading: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    borderBottom: '1px solid var(--border)',
    marginBottom: 'var(--spacing-xs)',
  },
  tab: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.72rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid',
    paddingBottom: '6px',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  hint: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  challengeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  select: {
    background: 'var(--bg-secondary, #1e1e1e)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    padding: '6px 10px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.78rem',
    cursor: 'pointer',
  },
  textarea: {
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    padding: '10px 14px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.82rem',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-sm)',
    marginTop: 'var(--spacing-xs)',
  },
  skipBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.68rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: '3px',
    padding: '8px 20px',
    cursor: 'pointer',
  },
  submitBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.68rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    background: 'var(--gold)',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: '3px',
    padding: '8px 24px',
    transition: 'opacity 0.2s',
  },
};
```

- [ ] **Step 2: Verify it exists and the file is clean**

```bash
npm test
```

Expected: All 12 tests still pass (the component has no testable pure logic).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/InterventionPanel.jsx
git commit -m "feat: add InterventionPanel component (audience question + direct challenge tabs)"
```

---

## Task 10: Update DebateThread

**Files:**
- Modify: `client/src/components/DebateThread.jsx`

Three changes: expand the colour array to 10, add phase-boundary headers, and style Audience entries distinctly.

- [ ] **Step 1: Expand `PERSONA_COLOURS`**

Replace:
```js
const PERSONA_COLOURS = [
  'var(--persona-0)',
  'var(--persona-1)',
  'var(--persona-2)',
  'var(--persona-3)',
  'var(--persona-4)',
];
```

With:
```js
const PERSONA_COLOURS = [
  'var(--persona-0)',
  'var(--persona-1)',
  'var(--persona-2)',
  'var(--persona-3)',
  'var(--persona-4)',
  'var(--persona-5)',
  'var(--persona-6)',
  'var(--persona-7)',
  'var(--persona-8)',
  'var(--persona-9)',
];
```

- [ ] **Step 2: Update the component signature**

Change:
```js
export default function DebateThread({ history, personas, typingIndex }) {
```

To:
```js
// currentPhase is used for display only — we derive phase headers from entry.phase
export default function DebateThread({ history, personas, typingIndex, currentPhase }) {
```

- [ ] **Step 3: Add phase-boundary header rendering and Audience entry styling**

Replace the history map block inside `<div style={styles.thread}>`:

```jsx
{history.map((msg, i) => {
  const colour = colourMap[msg.persona] ?? 'var(--text-primary)';
  const isNew = i === typingIndex;
  const isAudience = msg.persona.startsWith('Audience');

  // Render a phase divider when the phase label changes
  const prevPhase = i > 0 ? history[i - 1].phase : null;
  const showPhaseHeader = msg.phase && msg.phase !== 'audience' && msg.phase !== prevPhase;

  const PHASE_LABELS = {
    opening:  'Opening Statements',
    rebuttal: 'Rebuttal Round',
    closing:  'Closing Arguments',
  };

  return (
    <React.Fragment key={i}>
      {/* Phase divider — shown when a new phase begins */}
      {showPhaseHeader && (
        <div style={styles.phaseHeader}>
          {PHASE_LABELS[msg.phase] ?? msg.phase}
        </div>
      )}

      <div
        style={{
          ...styles.entry,
          animationDelay: `${i * 60}ms`,
          // Audience entries are visually de-emphasised
          opacity: isAudience ? 0.75 : 1,
        }}
      >
        {/* Persona label — different style for Audience entries */}
        <div
          style={{
            ...styles.speaker,
            color: isAudience ? 'var(--text-muted)' : colour,
            fontStyle: isAudience ? 'italic' : 'normal',
          }}
        >
          {msg.persona}
        </div>

        <TypewriterMessage
          content={msg.content}
          colour={isAudience ? 'var(--border)' : colour}
          isNew={isNew}
        />
      </div>
    </React.Fragment>
  );
})}
```

- [ ] **Step 4: Add the `phaseHeader` style**

In the `styles` object, add:

```js
phaseHeader: {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.62rem',
  color: 'var(--gold)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  borderBottom: '1px solid var(--border)',
  paddingBottom: 'var(--spacing-xs)',
  marginBottom: 'var(--spacing-xs)',
  opacity: 0.7,
},
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: All 12 tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/DebateThread.jsx
git commit -m "feat: update DebateThread — 10 colours, phase headers, Audience entry styling"
```

---

## Task 11: Overhaul App.jsx — phase state machine and full wiring

**Files:**
- Modify: `client/src/App.jsx`

This is the largest change. It replaces the `for (round 1..3)` loop with a three-phase orchestration that pauses between phases to let the user intervene.

The key technique for the intervention pause is a **Promise ref**: we store a `resolve` function in a `useRef`. The `handleTopicSubmit` async function awaits a Promise whose resolve function sits in the ref. When the user clicks Submit or Skip on `InterventionPanel`, we call that resolve function, unblocking the async flow.

- [ ] **Step 1: Add new imports and state at the top of `App.jsx`**

Add `useRef` to the React import. The file currently has `{ useState, useEffect }` — keep `useEffect`, just add `useRef`:
```js
import React, { useState, useEffect, useRef } from 'react';
```

Add the new import:
```js
import InterventionPanel from './components/InterventionPanel.jsx';
```

After the existing state declarations, add:

```js
const [panelCount, setPanelCount]     = useState(5);
const [currentPhase, setCurrentPhase] = useState(null); // 'opening'|'rebuttal'|'closing'|null

// Holds the Promise resolve function while waiting for user intervention.
// When the user submits or skips, we call this to unblock the orchestration.
const interventionResolveRef = useRef(null);
```

- [ ] **Step 2: Add `resolveIntervention` helper**

After the state declarations and before `handleNewDebate`, add:

```js
/**
 * Called by InterventionPanel when the user submits an intervention or skips.
 * Resolves the Promise that handleTopicSubmit is awaiting.
 *
 * @param {object|null} intervention - { type, targetPersona, content } or null for skip
 */
function resolveIntervention(intervention) {
  if (interventionResolveRef.current) {
    interventionResolveRef.current(intervention);
    interventionResolveRef.current = null;
  }
}
```

- [ ] **Step 3: Remove `TOTAL_ROUNDS` and `currentRound` — they are replaced by the new phase system**

At the top of `App.jsx`, remove the constant:
```js
// DELETE this line:
const TOTAL_ROUNDS = 3;
```

In the state declarations, remove:
```js
// DELETE this line:
const [currentRound, setCurrentRound] = useState(0);
```

- [ ] **Step 4: Update `handleNewDebate` to reset the new state and drop the old round reset**

In `handleNewDebate`, remove any `setCurrentRound(0)` call if present. Add these two lines:

```js
setPanelCount(5);       // reset picker to default
setCurrentPhase(null);  // clear any lingering debate phase
```

- [ ] **Step 5: Replace `handleTopicSubmit` with the new phase-aware version**

Replace the entire `handleTopicSubmit` function with:

```js
/**
 * Main orchestration function — called when the user submits a topic.
 * Runs three sequential phases (opening → rebuttal → closing) with an
 * optional user intervention pause between each.
 */
async function handleTopicSubmit(submittedTopic, submittedCount) {
  setTopic(submittedTopic);
  setPanelCount(submittedCount);
  setPhase('personas');
  setStatus('Assembling the panel...');
  setIsActive(true);

  // Human-readable labels for the status bar
  const PHASE_LABELS = {
    opening:  'Opening statements',
    rebuttal: 'Rebuttal round',
    closing:  'Closing arguments',
  };

  // ---- Step 1: Generate personas ----
  let generatedPersonas;
  try {
    const res = await fetch('/api/generate-personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: submittedTopic, count: submittedCount }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    generatedPersonas = data.personas;
    setPersonas(generatedPersonas);
  } catch (err) {
    setStatus(`Error generating personas: ${err.message}`);
    setIsActive(false);
    return;
  }

  // Brief pause so the user can read the personas before the debate begins
  await delay(1200);

  // ---- Step 2: Run the three debate phases ----
  let currentHistory = [];
  const phases = ['opening', 'rebuttal', 'closing'];

  /**
   * Run a single debate phase and animate the incoming messages.
   * Updates `currentHistory` in place (closed over from outer scope).
   */
  async function runPhase(phaseName, interventions) {
    setCurrentPhase(phaseName);
    setPhase(phaseName);
    setStatus(`${PHASE_LABELS[phaseName]} — the panel is speaking...`);

    const res = await fetch('/api/debate-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personas: generatedPersonas,
        history: currentHistory,
        topic: submittedTopic,
        phase: phaseName,
        interventions,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);

    // Reveal messages one at a time with a typewriter-paced delay
    for (let i = currentHistory.length; i < data.history.length; i++) {
      setTypingIndex(i);
      setHistory([...data.history.slice(0, i + 1)]);
      await delay(data.history[i].content.length * 12 + 400);
    }

    currentHistory = data.history;
  }

  /**
   * Pause the orchestration and wait for the user to submit or skip.
   * Returns the intervention object, or null if the user skipped.
   */
  function awaitIntervention() {
    return new Promise(resolve => {
      interventionResolveRef.current = resolve;
    });
  }

  for (let i = 0; i < phases.length; i++) {
    const phaseName = phases[i];
    let interventions = [];

    // Between phases (not before the first), pause for user input
    if (i > 0) {
      setPhase('intervention');
      setStatus('Your turn — ask a question or challenge a panellist.');

      const intervention = await awaitIntervention();
      if (intervention) interventions = [intervention];
    }

    try {
      await runPhase(phaseName, interventions);
    } catch (err) {
      setStatus(`Error in ${phaseName}: ${err.message}`);
      setIsActive(false);
      return;
    }
  }

  setTypingIndex(-1);
  setCurrentPhase(null);

  // ---- Step 3: Summarise ----
  setStatus('Moderator is synthesising the debate...');
  setPhase('summary');

  let debateSummary, debateVerdict;
  try {
    const res = await fetch('/api/summarise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: submittedTopic, history: currentHistory }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    debateSummary = data.summary;
    debateVerdict = data.verdict;
    setSummary(debateSummary);
    setVerdict(debateVerdict);
  } catch (err) {
    setStatus(`Error summarising: ${err.message}`);
    setIsActive(false);
    return;
  }

  // ---- Step 4: Save to Obsidian ----
  setStatus('Writing debate to Obsidian vault...');
  try {
    const res = await fetch('/api/save-to-obsidian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: submittedTopic,
        personas: generatedPersonas,
        history: currentHistory,
        summary: debateSummary,
        verdict: debateVerdict,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    setSavedPath(data.path);
    setStatus(`Saved to Obsidian: ${data.path.split('/').pop()}`);
  } catch (err) {
    setStatus(`Note: could not save to Obsidian — ${err.message}`);
  }

  setIsActive(false);
  setPhase('done');

  const newDebate = { id: Date.now(), topic: submittedTopic, date: new Date() };
  setDebates(prev => [...prev, newDebate]);
  setCurrentDebateId(newDebate.id);
}
```

- [ ] **Step 6: Update the `phase` state values in the existing `phase === 'debate'` JSX**

The old `phase` value `'debate'` no longer exists — it is replaced by `'opening'`, `'rebuttal'`, and `'closing'`. Find this condition in the render:

```jsx
{phase === 'input' ? (
  <TopicInput onSubmit={handleTopicSubmit} isLoading={false} />
) : (
  <div className="debate-content">
```

The `else` branch already covers all non-input phases correctly. No change needed here.

- [ ] **Step 7: Add `InterventionPanel` to the render, and update `DebateThread` props**

During the intervention pause, `currentPhase` holds the phase that just finished (it was set at the start of `runPhase`). We derive `phaseTo` from the phase sequence. Replace the `<DebateThread>` usage and add the `InterventionPanel` block:

```jsx
{/* Intervention pause — shown between phases */}
{phase === 'intervention' && personas.length > 0 && (() => {
  const phaseOrder = ['opening', 'rebuttal', 'closing'];
  const nextIndex = phaseOrder.indexOf(currentPhase) + 1;
  const phaseTo = phaseOrder[nextIndex] ?? 'closing';
  return (
    <InterventionPanel
      personas={personas}
      phaseFrom={currentPhase}
      phaseTo={phaseTo}
      onResolve={resolveIntervention}
    />
  );
})()}
```

Replace the `<DebateThread>` usage (which currently passes `currentRound` and `totalRounds`) with:

```jsx
<DebateThread
  history={history}
  personas={personas}
  typingIndex={typingIndex}
  currentPhase={currentPhase}
/>
```

- [ ] **Step 8: Run the full test suite one final time**

```bash
npm test
```

Expected: All 12 tests pass.

- [ ] **Step 9: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: overhaul App.jsx — phase state machine, intervention pause/resume, panel size wiring"
```

---

## Task 12: End-to-end smoke test

**No code changes — verification only.**

- [ ] **Step 1: Start the development server**

```bash
npm run dev
```

- [ ] **Step 2: Run through a complete debate**

1. Open the app in the browser
2. Set panel size to **7** (to confirm the configurable count works)
3. Enter a topic (e.g. "Should social media be regulated by governments?") and click Convene
4. Verify: 7 persona cards appear, each showing name, archetype, **background**, bias, tone
5. Verify: the Opening Statements phase begins; 7 messages arrive with the typewriter effect
6. Verify: after Opening, the **InterventionPanel** appears with the phase transition label
7. Submit an audience question on the Question tab
8. Verify: the Rebuttal Round begins; an "Audience" entry appears in the thread before the rebuttals; the phase header "Rebuttal Round" is shown as a divider
9. On the second intervention pause, test a **Direct Challenge** targeting a specific panellist
10. Verify: that panellist's rebuttal references the challenge
11. Verify: Closing Arguments phase runs, phase header appears
12. Verify: Summary and verdict render correctly

- [ ] **Step 3: Test edge cases**

- Set panel size to **3** (minimum) — confirm 3 personas are generated
- Set panel size to **10** (maximum) — confirm 10 personas, all 10 colours are distinct
- Click Skip on both intervention pauses — confirm the debate runs all the way through without interventions
- Confirm "New Debate" button resets everything cleanly

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end smoke test passed — debate mechanism redesign complete"
```

---

## Summary

| Task | What it delivers |
|---|---|
| 1 | Vitest test runner |
| 2 | Pure utility functions + 12 unit tests |
| 3 | CSS colours 5–9 |
| 4 | Richer personas, configurable count, symmetry validation |
| 5 | Phase-aware debate engine with interventions |
| 6 | Audience entries filtered from moderator summary |
| 7 | Background field on PersonaCard |
| 8 | Panel size picker on TopicInput |
| 9 | InterventionPanel component |
| 10 | Phase headers + Audience styling in DebateThread |
| 11 | Full App.jsx wiring |
| 12 | End-to-end verification |
