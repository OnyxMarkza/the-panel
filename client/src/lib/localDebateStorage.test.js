import { beforeEach, describe, expect, it } from 'vitest';
import {
  isLocalDebateId,
  isSupabaseDebateId,
  loadLocalDebateSnapshot,
  saveLocalDebateSnapshot,
  SNAPSHOTS_KEY,
} from './localDebateStorage.js';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe('localDebateStorage', () => {
  beforeEach(() => {
    global.localStorage = createMemoryStorage();
  });

  it('detects Supabase UUID vs local numeric ids', () => {
    expect(isSupabaseDebateId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isSupabaseDebateId('12345')).toBe(false);
    expect(isLocalDebateId(1730000000000)).toBe(true);
    expect(isLocalDebateId('1730000000000')).toBe(true);
  });

  it('round-trips a local debate snapshot', () => {
    const id = 1730000000001;
    saveLocalDebateSnapshot(id, {
      topic: 'AI regulation',
      personas: [{ name: 'Alex', archetype: 'Policy', bias: 'Pro', tone: 'Calm' }],
      history: [{ persona: 'Alex', content: 'We need guardrails.' }],
      summary: 'Summary text',
      verdict: 'Proceed carefully',
      persona_count: 4,
      savedPath: '/vault/debate.md',
    });

    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    expect(raw).toBeTruthy();

    const loaded = loadLocalDebateSnapshot(id);
    expect(loaded.topic).toBe('AI regulation');
    expect(loaded.history).toHaveLength(1);
    expect(loaded.persona_count).toBe(4);
    expect(loaded.savedPath).toBe('/vault/debate.md');
  });

  it('does not store snapshots for Supabase UUID sidebar ids', () => {
    saveLocalDebateSnapshot('550e8400-e29b-41d4-a716-446655440000', {
      topic: 'Should not persist',
      personas: [],
      history: [],
    });
    expect(localStorage.getItem(SNAPSHOTS_KEY)).toBeNull();
  });
});
