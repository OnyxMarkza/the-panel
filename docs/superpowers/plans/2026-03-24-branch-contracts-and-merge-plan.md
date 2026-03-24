# Multi-Agent Branch Plan — March 24, 2026

This document defines branch setup, shared contracts, conflict hotspots, and merge sequence for the current feature wave.

## 1) Branches (one per agent)

Create and maintain the following branches:

1. `feat/surprise-me-topics`
2. `feat/persona-count-3-7`
3. `feat/shareable-links-routing`
4. `chore/bugfix-perf-sweep`
5. `integration/final-stitch`

## 2) Shared API/UI Contracts (must be implemented consistently)

### TopicInput submit payload contract

`TopicInput` submit payload **must include** `personaCount`.

```ts
// TopicInput submit payload
interface TopicInputPayload {
  topic: string;
  personaCount: number; // required, expected range: 3..7
}
```

### Saved debate response contract

Save-debate response **must include and return** `debateId`.

```ts
interface SaveDebateResponse {
  success: boolean;
  debateId: string; // required
}
```

### Share URL contract

Canonical share URL format:

```txt
${origin}/debate/${debateId}
```

Where:
- `origin` is runtime app origin (e.g. `window.location.origin` in client contexts).
- `debateId` is the persisted debate identifier returned from save flow.

## 3) Conflict Hotspots + Merge Ordering Rules

### Hotspot: `client/src/components/TopicInput.jsx`
- `feat/surprise-me-topics` merges first.
- `feat/persona-count-3-7` rebases after Feature 1 merge.

### Hotspot: `client/src/App.jsx`
- `feat/persona-count-3-7` merges first.
- `feat/shareable-links-routing` rebases after Feature 2 merge.

## 4) Required PR Content for Each Feature Branch

Each feature branch PR must include all of:

1. **File-level change list**
   - Enumerate every touched file with one-line purpose.
2. **Manual test checklist**
   - Include happy-path and at least one edge-case check.
3. **Backward compatibility notes**
   - Confirm parity for:
     - local Express mirror (`server/routes/*` path)
     - Vercel function path (`api/*` path)

Use this mini-template in PR descriptions:

```md
## File-level change list
- path/to/file.ext — what changed and why

## Manual test checklist
- [ ] Scenario 1 (happy path)
- [ ] Scenario 2 (edge case)

## Backward compatibility notes
- [ ] Local Express mirror parity verified
- [ ] Vercel function parity verified
- Notes:
```

## 5) Merge Sequence (must follow)

1. Feature 1: `feat/surprise-me-topics`
2. Feature 2: `feat/persona-count-3-7`
3. Feature 3: `feat/shareable-links-routing`
4. Bug/Perf sweep: `chore/bugfix-perf-sweep`
5. Integration verification: `integration/final-stitch`

## 6) Integration Gate (on `integration/final-stitch`)

Before final merge to mainline, verify all of:

- Contracts are consistent end-to-end:
  - `TopicInput` payload includes `personaCount`.
  - save response exposes `debateId`.
  - share links render as `${origin}/debate/${debateId}`.
- No unresolved rebase artifacts in `TopicInput.jsx` and `App.jsx`.
- Branch notes include file list, manual checks, and compatibility notes.
