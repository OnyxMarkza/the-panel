# Debate Mechanism Redesign — Design Spec

**Date:** 2026-03-21
**Approach:** B — Phase-aware redesign
**Status:** Approved

---

## 1. Overview

The Panel's debate engine is redesigned around three new capabilities:

1. **Configurable panel size** — the user picks 3–10 panellists before each debate
2. **Phase-aware debate structure** — three purposeful phases (Opening, Rebuttals, Closing) replace three identical rounds
3. **User interventions** — the user can inject audience questions or direct challenges between phases
4. **Richer personas** — each panellist gains a `background` credential and a `relationships` web of alliances and rivalries

The Express server routes (`server/routes/`) and Vercel API functions (`api/`) remain in sync throughout — changes are mirrored in both.

---

## 2. Persona Schema

### Current shape
```js
{
  name:      string,
  archetype: string,
  bias:      string,
  tone:      string,
}
```

### New shape
```js
{
  name:          string,   // e.g. "Dr. Amara Osei"
  archetype:     string,   // e.g. "Public health pragmatist"
  bias:          string,   // one-sentence slant on the topic
  tone:          string,   // one word: "measured", "combative", etc.
  background:    string,   // short credential, e.g. "Former WHO regional director"
  relationships: [
    { name: string, dynamic: "ally" | "rival" | "neutral" }
  ]
}
```

### Relationship rules
- Relationships form a coherent web: if A is rival with B, B lists A as rival
- The generation prompt explicitly enforces this symmetry
- Relationships are used in debate system prompts to nudge tone: rivals get challenged, allies defended

### Endpoint changes — `POST /api/generate-personas`
- New input field: `count` (integer, 3–10, defaults to 5)
- The hardcoded `5` in the prompt and validation is replaced with `count`
- System prompt updated to request `background` and `relationships`
- Validation loop checks all new fields are present and correctly typed
- Mirrored in both `api/generate-personas.js` and `server/routes/personas.js`

---

## 3. Phase-Aware Debate Engine

### Phase structure

The three identical rounds are replaced by three purposeful phases:

| Phase | Purpose | Key system prompt instruction |
|---|---|---|
| `opening` | Each panellist stakes their position | "Make your opening argument. Do not respond to others yet." |
| `rebuttal` | Each panellist directly challenges someone | "Address one specific person by name. Disagree or push back directly." |
| `closing` | Each panellist holds their ground or concedes | "Give your closing argument. You may acknowledge where you shifted, but defend your core position." |

### Direct rebuttals
- In the `rebuttal` phase, personas are instructed to name a prior speaker explicitly
- Relationship data shapes who gets challenged: rivals are confronted, allies are defended
- This is prompt engineering only — no structural change to the history format
- Example output: "I take issue with what Marcus said about the evidence base..."

### Endpoint changes — `POST /api/debate-round`

New input parameters:
```js
{
  personas:      Persona[],    // existing
  history:       Message[],    // existing
  topic:         string,       // existing
  phase:         'opening' | 'rebuttal' | 'closing',  // NEW — replaces roundNumber
  interventions: [             // NEW — can be empty array
    {
      type:          'question' | 'challenge',
      targetPersona: string | null,  // null for audience questions
      content:       string,
    }
  ]
}
```

Interventions are prepended to the running history as `Audience` entries before any persona speaks. For a direct challenge targeting one specific person, only that persona receives an additional instruction in their system prompt: *"The audience has directed a question specifically at you — address it."*

Mirrored in both `api/debate-round.js` and `server/routes/debate.js`.

---

## 4. User Intervention UI

### InterventionPanel component (new)

Appears between each phase as a slide-in panel. Contains two tabs:

**Audience Question tab**
- Free-text input
- Question is injected as `{ persona: 'Audience', content: question }`
- Addressed by all panellists in the next phase

**Direct Challenge tab**
- Free-text input + dropdown of panellist names
- Injected as `{ persona: 'Audience → [Name]', content: challenge }`
- Only the targeted panellist receives an explicit instruction to respond

**Skip button**
- Skips the intervention entirely; next phase starts immediately

### Visual treatment
- Styled consistently: dark background, gold accents, JetBrains Mono inputs
- Shows the phase just completed and the phase about to begin
- Audience entries in `DebateThread` are rendered distinctly — labelled "Audience" in a muted style, visually separate from panellist speech

---

## 5. Frontend Phase State Machine

### New phase sequence
```
input → personas → opening → intervention → rebuttal → intervention → closing → summary → done
```

Replaces the current:
```
input → personas → debate (3 rounds) → summary → done
```

### Panel size picker
- Added to `TopicInput` component as a labelled number input or slider (range 3–10, default 5)
- `panelCount` flows as a prop through `App.jsx` into the persona generation and debate calls

---

## 6. Colour System Extension

### CSS variables (`index.css`)
Add `--persona-5` through `--persona-9` to support panels larger than 5.

### `PERSONA_COLOURS` array (`DebateThread.jsx`)
Expand from 5 to 10 entries mapping to the new CSS variables.

### `PersonaCard` component
Add a `background` field rendered beneath the `archetype` line.

---

## 7. Files Changed

| File | Change |
|---|---|
| `api/generate-personas.js` | Add `count` param, new schema with `background` + `relationships` |
| `server/routes/personas.js` | Same as above |
| `api/debate-round.js` | Add `phase` + `interventions` params, phase-aware prompts |
| `server/routes/debate.js` | Same as above |
| `client/src/App.jsx` | New phase state machine, intervention collection, panel size state |
| `client/src/components/TopicInput.jsx` | Add panel size picker (3–10) |
| `client/src/components/PersonaCard.jsx` | Render `background` field |
| `client/src/components/DebateThread.jsx` | Expand colour array, distinct Audience entry styling, phase headers |
| `client/src/index.css` | Add `--persona-5` through `--persona-9` |
| `client/src/components/InterventionPanel.jsx` | New component — audience question + direct challenge UI |

---

## 8. Out of Scope

- Streaming responses (deferred to a future phase)
- Changes to the summary/verdict format
- Persistent debate history across sessions
- Authentication or user accounts
