import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Resolve .env relative to THIS file (server/lib/supabase.js → ../../.env)
// Same pattern as groq.js so this works regardless of where the process starts.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// SUPABASE_URL        → e.g. https://xyzabc.supabase.co
// SUPABASE_SERVICE_ROLE_KEY → secret key, server-side only, never expose to client
const supabase = createClient(
  process.env.SUPABASE_URL,          // placeholder: set in .env after creating project
  process.env.SUPABASE_SERVICE_ROLE_KEY  // placeholder: set in .env after creating project
);

// ---------------------------------------------------------------------------
// debates table helpers
// ---------------------------------------------------------------------------

/**
 * Create a new debate row and return its generated UUID.
 *
 * @param {string} topic - The debate topic.
 * @param {number} personaCount - Number of personas for this debate.
 * @returns {Promise<string>} The new debate's UUID.
 */
export async function insertDebate(topic, personaCount) {
  const { data, error } = await supabase
    .from('debates')
    .insert({ topic, persona_count: personaCount })
    .select('id')
    .single();

  if (error) throw new Error(`[supabase] insertDebate failed: ${error.message}`);
  return data.id;
}

/**
 * Update a debate row with the generated summary, verdict, and the Obsidian
 * file path that was written (so the two stores stay linked).
 *
 * @param {string} debateId  - UUID of the debate row.
 * @param {string} summary   - Plain-text summary from the summarise route.
 * @param {string} verdict   - One-sentence verdict string.
 * @param {string} [obsidianPath] - File path written by vaultWriter (optional).
 */
export async function updateDebateSummary(debateId, summary, verdict, obsidianPath) {
  const { error } = await supabase
    .from('debates')
    .update({
      summary,
      verdict,
      obsidian_path: obsidianPath ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', debateId);

  if (error) throw new Error(`[supabase] updateDebateSummary failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// personas table helpers
// ---------------------------------------------------------------------------

/**
 * Batch-insert all personas for a debate in one round-trip.
 * Returns a map of { personaName -> supabase UUID } so messages can reference
 * the correct foreign key.
 *
 * @param {string} debateId       - UUID of the parent debate row.
 * @param {Array<{name: string, archetype: string, bias: string, tone: string}>} personasArray
 * @returns {Promise<Object>}     - { [name]: uuid }
 */
export async function insertPersonas(debateId, personasArray) {
  // Add debate_id and position_in_debate to each persona before inserting.
  const rows = personasArray.map((persona, index) => ({
    debate_id: debateId,
    name: persona.name,
    archetype: persona.archetype,
    bias: persona.bias,
    tone: persona.tone,
    position_in_debate: index,  // 0-based order they appear in the debate
  }));

  const { data, error } = await supabase
    .from('personas')
    .insert(rows)
    .select('id, name');

  if (error) throw new Error(`[supabase] insertPersonas failed: ${error.message}`);

  // Build a name → id lookup so the caller can resolve persona IDs by name.
  const idMap = {};
  for (const row of data) {
    idMap[row.name] = row.id;
  }
  return idMap;
}

// ---------------------------------------------------------------------------
// messages table helpers
// ---------------------------------------------------------------------------

/**
 * Batch-insert all messages for a debate.
 * Each message in the array must have: personaName, content, roundNumber, messageOrder.
 * The personaIdMap (returned by insertPersonas) is used to resolve persona UUIDs.
 *
 * @param {string} debateId      - UUID of the parent debate row.
 * @param {Array<{personaName: string, content: string, roundNumber: number, messageOrder: number}>} messagesArray
 * @param {Object} personaIdMap  - { [name]: uuid } returned by insertPersonas.
 */
export async function insertMessages(debateId, messagesArray, personaIdMap) {
  const rows = messagesArray.map((msg) => ({
    debate_id: debateId,
    // Look up the UUID for this persona by name; throw early if something is wrong.
    persona_id: personaIdMap[msg.personaName],
    content: msg.content,
    round_number: msg.roundNumber,
    message_order: msg.messageOrder,
  }));

  // Guard: if any persona_id is undefined, we have a mapping problem.
  const missing = rows.filter((r) => r.persona_id === undefined);
  if (missing.length > 0) {
    const names = missing.map((r) => r.persona_name).join(', ');
    throw new Error(`[supabase] insertMessages: no persona ID found for: ${names}`);
  }

  const { error } = await supabase.from('messages').insert(rows);

  if (error) throw new Error(`[supabase] insertMessages failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Read helpers (used by the /api/debates routes)
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of debates, newest first.
 * Returns the raw rows plus a total count for pagination.
 *
 * @param {number} limit   - Number of rows to return (default 10).
 * @param {number} offset  - Row offset for pagination (default 0).
 * @returns {Promise<{ debates: Array, total: number }>}
 */
export async function fetchDebates(limit = 10, offset = 0) {
  const { data, error, count } = await supabase
    .from('debates')
    .select('id, topic, persona_count, created_at, summary, verdict, obsidian_path', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`[supabase] fetchDebates failed: ${error.message}`);
  return { debates: data, total: count };
}

/**
 * Fetch a single debate with its personas and messages joined.
 * Messages are ordered by round then position within the round.
 *
 * @param {string} id - UUID of the debate.
 * @returns {Promise<Object>}
 */
export async function fetchDebateById(id) {
  // Fetch the debate row itself.
  const { data: debate, error: debateError } = await supabase
    .from('debates')
    .select('*')
    .eq('id', id)
    .single();

  if (debateError) throw new Error(`[supabase] fetchDebateById failed: ${debateError.message}`);

  // Fetch associated personas.
  const { data: personas, error: personasError } = await supabase
    .from('personas')
    .select('*')
    .eq('debate_id', id)
    .order('position_in_debate');

  if (personasError) throw new Error(`[supabase] fetchPersonas failed: ${personasError.message}`);

  // Fetch messages ordered by round then position.
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('debate_id', id)
    .order('round_number')
    .order('message_order');

  if (messagesError) throw new Error(`[supabase] fetchMessages failed: ${messagesError.message}`);

  return { ...debate, personas, messages };
}

/**
 * Full-text search across debate topics.
 * Uses ilike (case-insensitive LIKE) -- good enough for MVP, no FTS index needed.
 *
 * @param {string} query  - Search string.
 * @param {number} limit  - Max results (default 20).
 * @returns {Promise<Array>}
 */
export async function searchDebates(query, limit = 20) {
  const { data, error } = await supabase
    .from('debates')
    .select('id, topic, persona_count, created_at, summary, verdict')
    .ilike('topic', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`[supabase] searchDebates failed: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// storageAdapter convenience wrapper
// ---------------------------------------------------------------------------

/**
 * Save a complete debate in one call. Used by shared/storageAdapter.js and
 * server/routes/obsidian.js.
 *
 * This wraps insertDebate, insertPersonas, insertMessages, and
 * updateDebateSummary into a single transaction-like sequence.
 * If any step fails, an error is thrown and the caller handles it.
 *
 * @param {Object} params
 * @param {string} params.topic
 * @param {Array<{name, archetype, bias, tone}>} params.personas
 * @param {Array<{persona: string, content: string}>} params.history
 * @param {string} params.summary
 * @param {string} params.verdict
 * @param {string} [params.obsidianPath] - Optional vault file path to store alongside the record
 * @returns {Promise<{ id: string }>}
 */
export async function saveDebateToSupabase({ topic, personas, history, summary, verdict, obsidianPath }) {
  const personaCount = Array.isArray(personas) && personas.length > 0 ? personas.length : 5;
  // Create the parent debate row first so we have an ID for foreign keys
  const debateId = await insertDebate(topic, personaCount);

  // Insert all personas and get back a name → UUID map
  const personaIdMap = await insertPersonas(debateId, personas);

  // Infer round numbers from position in history.
  // Each round has one message per persona, so:
  //   messages 0 to N-1    = round 1
  //   messages N to 2N-1   = round 2  (etc.)
  const numPersonas = personas.length || 1;
  const messages = history.map((msg, index) => ({
    personaName: msg.persona,
    content: msg.content,
    roundNumber: Math.floor(index / numPersonas) + 1,
    // Position within the round (0-based), matching the schema comment.
    // e.g. for 5 personas: 0,1,2,3,4 | 0,1,2,3,4 | 0,1,2,3,4
    messageOrder: index % numPersonas,
  }));
  await insertMessages(debateId, messages, personaIdMap);

  // Attach summary, verdict, and optional Obsidian vault path to the debate row
  await updateDebateSummary(debateId, summary, verdict, obsidianPath);

  return { id: debateId };
}
