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

  return {
    ok: true,
    personas,
    topic,
    roundNumber,
    history: normalizeHistory(body?.history),
  };
}
