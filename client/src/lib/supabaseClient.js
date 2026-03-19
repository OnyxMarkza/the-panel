import { createClient } from '@supabase/supabase-js';

// Vite exposes only VITE_ prefixed variables to the browser bundle.
// VITE_SUPABASE_URL       → your project URL (e.g. https://xyzabc.supabase.co)
// VITE_SUPABASE_ANON_KEY  → public anon key (safe to expose, row-level security enforces access)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,      // placeholder: set in .env after creating project
  import.meta.env.VITE_SUPABASE_ANON_KEY  // placeholder: set in .env after creating project
);

// ---------------------------------------------------------------------------
// Read-only helpers for the frontend (debate history browsing)
// All writes go through the server (service role key) -- never the client.
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of debates, newest first.
 *
 * @param {number} limit   - Rows per page (default 10).
 * @param {number} offset  - Pagination offset (default 0).
 * @returns {Promise<{ debates: Array, total: number, hasMore: boolean }>}
 */
export async function fetchDebates(limit = 10, offset = 0) {
  const { data, error, count } = await supabase
    .from('debates')
    .select('id, topic, created_at, summary, verdict', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`fetchDebates: ${error.message}`);

  return {
    debates: data,
    total: count,
    hasMore: offset + limit < count,
  };
}

/**
 * Fetch a full debate with its personas and messages.
 *
 * @param {string} id - Debate UUID.
 * @returns {Promise<Object>}
 */
export async function fetchDebateById(id) {
  const { data: debate, error: debateError } = await supabase
    .from('debates')
    .select('*')
    .eq('id', id)
    .single();

  if (debateError) throw new Error(`fetchDebateById: ${debateError.message}`);

  const { data: personas, error: personasError } = await supabase
    .from('personas')
    .select('*')
    .eq('debate_id', id)
    .order('position_in_debate');

  if (personasError) throw new Error(`fetchPersonas: ${personasError.message}`);

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('debate_id', id)
    .order('round_number')
    .order('message_order');

  if (messagesError) throw new Error(`fetchMessages: ${messagesError.message}`);

  return { ...debate, personas, messages };
}

/**
 * Search debates by topic keyword (case-insensitive).
 *
 * @param {string} query  - Search string.
 * @param {number} limit  - Max results (default 20).
 * @returns {Promise<Array>}
 */
export async function searchDebates(query, limit = 20) {
  const { data, error } = await supabase
    .from('debates')
    .select('id, topic, created_at, summary, verdict')
    .ilike('topic', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`searchDebates: ${error.message}`);
  return data;
}
