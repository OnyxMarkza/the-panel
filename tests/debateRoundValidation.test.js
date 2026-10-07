import { describe, it, expect } from 'vitest';
import {
  normalizeTopic,
  normalizeHistory,
  parseDebateRoundRequest,
} from '../shared/debateRoundValidation.js';

describe('debateRoundValidation', () => {
  it('normalizeTopic trims and collapses whitespace', () => {
    expect(normalizeTopic('  hello   world  ')).toBe('hello world');
    expect(normalizeTopic(42)).toBe('');
  });

  it('normalizeHistory fills missing persona labels', () => {
    const history = normalizeHistory([{ content: '  point  ' }]);
    expect(history).toEqual([{ persona: 'Panellist 1', content: 'point' }]);
  });

  it('parseDebateRoundRequest rejects empty personas', () => {
    const result = parseDebateRoundRequest({ topic: 'AI ethics', personas: [] });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('VALIDATION_ERROR');
  });

  it('parseDebateRoundRequest rejects missing topic', () => {
    const result = parseDebateRoundRequest({
      personas: [{ name: 'Alex', archetype: 'Dev', bias: 'pro', tone: 'calm' }],
      topic: '   ',
    });
    expect(result.ok).toBe(false);
  });

  it('parseDebateRoundRequest accepts valid body', () => {
    const result = parseDebateRoundRequest({
      topic: 'Climate policy',
      personas: [{ name: 'Sam', archetype: 'Analyst', bias: 'neutral', tone: 'sharp' }],
      roundNumber: '2',
      history: [{ persona: 'Sam', content: 'Earlier point.' }],
    });
    expect(result.ok).toBe(true);
    expect(result.topic).toBe('Climate policy');
    expect(result.roundNumber).toBe(2);
    expect(result.history).toHaveLength(1);
  });
});
