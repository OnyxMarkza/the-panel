import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Resolve .env relative to THIS file (server/lib/supabase.js → ../../.env)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a new debate row and return its generated UUID.
 *
 * @param {string} topic - The debate topic.
 * @param {number} [personaCount=5] - Number of personas used in the debate.
 * @returns {Promise<string>} The new debate's UUID.
 */
export async function insertDebate(topic, personaCount = 5) {
  const count = Number.isInteger(personaCount)
    ? Math.min(7, Math.max(3, personaCount))
    : 5;

  const { data, error } = await supabase
    .from('debates')
    .insert({ topic, persona_count: count })
    .select('id')
    .single();

  if (error) throw new Error(`[supabase] insertDebate failed: ${error.message}`);
  return data.id;
}

/**
 * Update a debate row with generated summary/verdict and optional vault path.
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

/**
 * Insert all personas for a debate and return { [name]: uuid }.
 */
export async function insertPersonas(debateId, personasArray) {
  const rows = personasArray.map((persona, index) => ({
    debate_id: debateId,
    name: persona.name,
    archetype: persona.archetype,
    bias: persona.bias,
    tone: persona.tone,
    position_in_debate: index,
  }));

  const { data, error } = await supabase
    .from('personas')
    .insert(rows)
    .select('id, name');

  if (error) throw new Error(`[supabase] insertPersonas failed: ${error.message}`);

  const idMap = {};
  for (const row of data) {
    idMap[row.name] = row.id;
  }
  return idMap;
}

/**
 * Insert all messages for a debate.
 */
export async function insertMessages(debateId, messagesArray, personaIdMap) {
  const rows = messagesArray.map((msg) => ({
    debate_id: debateId,
    persona_id: personaIdMap[msg.personaName],
    content: msg.content,
    round_number: msg.roundNumber,
    message_order: msg.messageOrder,
  }));

  const missingPersonaNames = messagesArray
    .filter((msg) => personaIdMap[msg.personaName] === undefined)
    .map((msg) => msg.personaName);

  if (missingPersonaNames.length > 0) {
    throw new Error(`[supabase] insertMessages: no persona ID found for: ${missingPersonaNames.join(', ')}`);
  }

  const { error } = await supabase.from('messages').insert(rows);
  if (error) throw new Error(`[supabase] insertMessages failed: ${error.message}`);
}

/**
 * Fetch a paginated list of debates, newest first.
 *
 * @returns {Promise<{ debates: Array, total: number }>}
 */
export async function fetchDebates(limit = 10, offset = 0) {
  const { data, error, count } = await supabase
    .from('debates')
    .select('id, topic, persona_count, created_at, summary, verdict, obsidian_path', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`[supabase] fetchDebates failed: ${error.message}`);
  const normalized = (data ?? []).map((row) => ({ ...row, persona_count: row.persona_count ?? 5 }));
  return { debates: normalized, total: count ?? 0 };
}

/**
 * Fetch a single debate with associated personas and messages.
 */
export async function fetchDebateById(id) {
  const { data: debate, error: debateError } = await supabase
    .from('debates')
    .select('*')
    .eq('id', id)
    .single();

  if (debateError) throw new Error(`[supabase] fetchDebateById failed: ${debateError.message}`);

  const { data: personas, error: personasError } = await supabase
    .from('personas')
    .select('*')
    .eq('debate_id', id)
    .order('position_in_debate');

  if (personasError) throw new Error(`[supabase] fetchPersonas failed: ${personasError.message}`);

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('debate_id', id)
    .order('round_number')
    .order('message_order');

  if (messagesError) throw new Error(`[supabase] fetchMessages failed: ${messagesError.message}`);

  return { ...debate, persona_count: debate.persona_count ?? 5, personas, messages };
}

/**
 * Search debates by topic.
 */
export async function searchDebates(query, limit = 20) {
  const { data, error } = await supabase
    .from('debates')
    .select('id, topic, persona_count, created_at, summary, verdict')
    .ilike('topic', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`[supabase] searchDebates failed: ${error.message}`);
  return (data ?? []).map((row) => ({ ...row, persona_count: row.persona_count ?? 5 }));
}

/**
 * Save a complete debate to Supabase.
 *
 * @returns {Promise<{ id: string }>}
 */
export async function saveDebateToSupabase({ topic, personas, history, summary, verdict, obsidianPath }) {
  const safePersonas = Array.isArray(personas) ? personas : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const personaCount = safePersonas.length > 0 ? safePersonas.length : 5;

  const debateId = await insertDebate(topic, personaCount);
  const personaIdMap = await insertPersonas(debateId, safePersonas);

  const numPersonas = safePersonas.length || 1;
  const messages = safeHistory.map((msg, index) => ({
    personaName: msg.persona,
    content: msg.content,
    roundNumber: Math.floor(index / numPersonas) + 1,
    messageOrder: index % numPersonas,
  }));

  await insertMessages(debateId, messages, personaIdMap);
  await updateDebateSummary(debateId, summary, verdict, obsidianPath);

  return { id: debateId };
}
