const TOPIC_COUNT = 5;
const MAX_TOPIC_LENGTH = 100;

export function validateSuggestionRequestBody(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }

  const seed = typeof body.seed === 'string' ? body.seed.trim() : '';

  if (seed.length > MAX_TOPIC_LENGTH) {
    throw new Error(`Seed must be ${MAX_TOPIC_LENGTH} characters or less.`);
  }

  return { seed };
}

export function buildSuggestionPrompts(seed) {
  const systemPrompt = `You generate debate topic ideas.
Return ONLY a valid JSON array of exactly ${TOPIC_COUNT} strings.
No markdown, no keys, no prose, no numbering.`;

  const userPrompt = seed
    ? `Generate ${TOPIC_COUNT} concise, debatable topic prompts inspired by this seed: "${seed}".`
    : `Generate ${TOPIC_COUNT} concise, varied debate topic prompts.`;

  return { systemPrompt, userPrompt };
}

export function normalizeSuggestedTopics(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Model returned an empty response.');
  }

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Model did not return a JSON array.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Model returned invalid JSON.');
  }

  if (!Array.isArray(parsed) || parsed.length !== TOPIC_COUNT) {
    throw new Error(`Expected exactly ${TOPIC_COUNT} suggested topics.`);
  }

  const topics = parsed.map((item, index) => {
    if (typeof item !== 'string') {
      throw new Error(`Topic ${index + 1} must be a string.`);
    }

    const normalized = item.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      throw new Error(`Topic ${index + 1} cannot be empty.`);
    }

    return normalized.slice(0, MAX_TOPIC_LENGTH);
  });

  const deduped = [...new Set(topics.map(topic => topic.toLowerCase()))];
  if (deduped.length !== TOPIC_COUNT) {
    throw new Error('Model returned duplicate topics.');
  }

  return topics;
}
