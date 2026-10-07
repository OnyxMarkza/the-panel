export const MIN_PERSONA_COUNT = 3;
export const MAX_PERSONA_COUNT = 7;
export const MAX_TOPIC_LENGTH = 100;
/** Max prior messages in history (≈ 3 rounds × 7 personas + buffer). */
export const MAX_HISTORY_MESSAGES = 25;

export function normalizeTopic(topic) {
  return typeof topic === 'string' ? topic.trim().replace(/\s+/g, ' ') : '';
}

export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((msg) => msg && typeof msg === 'object')
    .map((msg, i) => ({
      persona: typeof msg.persona === 'string' && msg.persona.trim() ? msg.persona.trim() : `Panellist ${i + 1}`,
      content: typeof msg.content === 'string' ? msg.content.trim() : '',
    }));
}

/**
 * Shared validation for POST /api/debate-round (Express + Vercel).
 *
 * @returns {{ ok: true, personas: Array, topic: string, roundNumber: number, history: Array } | { ok: false, status: number, body: object }}
 */
export function parseDebateRoundRequest(body) {
  const personas = Array.isArray(body?.personas) ? body.personas : [];
  const topic = normalizeTopic(body?.topic);
  const roundNumber = Number.parseInt(body?.roundNumber, 10) || 1;

  if (personas.length === 0 || !topic) {
    return {
      ok: false,
      status: 400,
      body: {
        error: true,
        code: 'VALIDATION_ERROR',
        message: 'personas and topic are required.',
      },
    };
  }

  if (topic.length > MAX_TOPIC_LENGTH) {
    return {
      ok: false,
      status: 422,
      body: {
        error: true,
        code: 'VALIDATION_ERROR',
        message: `Topic must be ${MAX_TOPIC_LENGTH} characters or less.`,
      },
    };
  }

  if (personas.length < MIN_PERSONA_COUNT || personas.length > MAX_PERSONA_COUNT) {
    return {
      ok: false,
      status: 422,
      body: {
        error: true,
        code: 'VALIDATION_ERROR',
        message: `personas must contain between ${MIN_PERSONA_COUNT} and ${MAX_PERSONA_COUNT} entries.`,
      },
    };
  }

  const history = normalizeHistory(body?.history);
  if (history.length > MAX_HISTORY_MESSAGES) {
    return {
      ok: false,
      status: 422,
      body: {
        error: true,
        code: 'VALIDATION_ERROR',
        message: `history may contain at most ${MAX_HISTORY_MESSAGES} messages.`,
      },
    };
  }

  return {
    ok: true,
    personas,
    topic,
    roundNumber,
    history,
  };
}
