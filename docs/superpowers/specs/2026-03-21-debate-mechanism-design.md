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
- Token limit increased from 800 to 1200 to accommodate the richer schema at larger panel sizes
- Validation loop checks all new fields are present and correctly typed
- Validation loop also verifies relationship symmetry: for every entry `{ name: B, dynamic: X }` in persona A's relationships, persona B must have a corresponding entry for A. If the LLM returns an asymmetric web, the endpoint retries once. If the second attempt is also asymmetric, it returns a 500 error — no unbounded retry loop
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

**Intervention history injection (backend responsibility):**
The backend converts `interventions` into history entries before any persona speaks:
- `type: 'question'` → `{ persona: 'Audience', content, phase: currentPhase }`
- `type: 'challenge'` → `{ persona: 'Audience → [targetPersona]', content, phase: currentPhase }`

The `persona: 'Audience → [Name]'` format is both the history entry value and the display convention in DebateThread — the frontend does not need a separate conversion step. For a direct challenge, only the targeted persona receives an additional instruction in their system prompt: *"The audience has directed a question specifically at you — address it."*

**Each history entry gains a `phase` field** (`'opening' | 'rebuttal' | 'closing' | 'audience'`) so DebateThread can render phase-boundary headers without relying on index arithmetic. Every entry pushed inside the per-persona loop in `debate-round.js` must carry `phase: currentPhase` (e.g. `{ persona, content, phase }`). Audience entries injected from the `interventions` array use `phase: 'audience'`.

Mirrored in both `api/debate-round.js` and `server/routes/debate.js`.

---

## 4. User Intervention UI

### InterventionPanel component (new)

Appears between each phase as a slide-in panel. Contains two tabs:

**Audience Question tab**
- Free-text input
- Question is injected as `{ persona: 'Audience', content: question, phase: 'audience' }`
- Addressed by all panellists in the next phase

**Direct Challenge tab**
- Free-text input + dropdown of panellist names
- Injected as `{ persona: 'Audience → [Name]', content: challenge, phase: 'audience' }`
- Only the targeted panellist receives an explicit instruction to respond

**Mutual exclusivity:** Only one intervention can be submitted per pause. The two tabs are mutually exclusive — switching tabs clears the other tab's input. A single Submit button sends whichever tab is currently active. This avoids ambiguity about ordering and targeting when both are filled.

**Skip button**
- Skips the intervention entirely; next phase starts immediately with an empty `interventions` array

### Visual treatment
- Styled consistently: dark background, gold accents, JetBrains Mono inputs
- Shows the phase just completed and the phase about to begin
- Audience entries in `DebateThread` are rendered distinctly — labelled "Audience" (or "Audience → [Name]") in a muted style, visually separate from panellist speech

### Error handling
If the API call for the next phase fails after an intervention has been submitted, the error is displayed via the existing `StatusBar` pattern (`setStatus(error)`, `setIsActive(false)`). The intervention data is discarded along with the failed round — it is not re-queued. The state machine does not automatically retry. The user must start a new debate.

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

### State variable migration
The existing `roundNumber` loop variable and `TOTAL_ROUNDS = 3` constant in `App.jsx` are removed. They are replaced by a new `currentPhase` state variable (`'opening' | 'rebuttal' | 'closing' | null`).

**Important:** `App.jsx` already has a `phase` state variable (tracking the overall UI state machine: `'input' | 'personas' | 'opening' | 'intervention' | 'rebuttal' | 'closing' | 'summary' | 'done'`). The new variable is named `currentPhase` and is entirely separate — it tracks which debate phase is running, while `phase` tracks the broader UI screen state. Do not rename the existing `phase` variable.

The `handleNewDebate` reset function must also reset `currentPhase` to `null` alongside the existing resets.

The `App.jsx` fetch call to `/api/generate-personas` must include `count: panelCount` in the request body. The fetch call to `/api/debate-round` must include `phase: currentPhase` (and `panelCount` is implicit via the personas array length, so it does not need to be sent separately).

The status bar message changes from "Round X of 3 — the panel is deliberating..." to e.g. "Opening statements — the panel is speaking...". The `DebateThread` component's `typingIndex` prop is unchanged; its `currentRound`/`totalRounds` props (if any) are replaced by `currentPhase: string`.

### Panel size picker
- Added to `TopicInput` component as a labelled number input or slider (range 3–10, default 5)
- `panelCount` flows as a prop through `App.jsx` into the persona generation and debate calls

---

## 6. Colour System Extension

### CSS variables (`index.css`)
Add `--persona-5` through `--persona-9` to support panels larger than 5.

### `PERSONA_COLOURS` array (`DebateThread.jsx`)
Expand from 5 to 10 entries mapping to the new CSS variables.

### `DebateThread` prop signature changes
- Remove `currentRound` / `totalRounds` props (no longer meaningful)
- Add `currentPhase: 'opening' | 'rebuttal' | 'closing' | null`
- Phase-boundary headers ("Opening Statements", "Rebuttal Round", "Closing Arguments") are derived from the `phase` field on each history entry — rendered as a divider when `entry.phase` differs from the previous entry's `phase`
- `Audience` entries (where `entry.persona` starts with `'Audience'`) are rendered in a distinct muted style

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
| `api/summarise.js` | Filter out `Audience` history entries when building the moderator transcript (or prefix them clearly), so they do not disrupt the summary format |
| `server/routes/summarise.js` | Same as above |

Note: `server/routes/debates.js` is a read-only Supabase fetch route and does **not** need changes.

---

## 8. Out of Scope

- Streaming responses (deferred to a future phase)
- Changes to the summary/verdict format
- Persistent debate history across sessions
- Authentication or user accounts
