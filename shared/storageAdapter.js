/**
 * storageAdapter.js
 *
 * Decides where to save debate data based on the environment:
 *   - Local dev (LOCAL_STORAGE=true or NODE_ENV=development): writes to the
 *     Obsidian vault via server/lib/vaultWriter.js
 *   - Production (Vercel): saves to Supabase via server/lib/supabase.js
 *
 * Dynamic imports are used so that the 'fs' module (required by vaultWriter)
 * is never loaded in serverless environments where the filesystem is unavailable.
 *
 * Storage failures are caught here and do NOT crash the debate — the caller
 * receives a { success: false, error } object instead of a thrown exception.
 */

function isLocalEnvironment() {
  return process.env.LOCAL_STORAGE === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Save a completed debate to the appropriate storage backend.
 *
 * @param {Object} debateData - { topic, personas, history, summary, verdict }
 * @returns {Promise<{ success: boolean, id?: string, path?: string, error?: string }>}
 */
export async function saveBattle(debateData) {
  try {
    if (isLocalEnvironment()) {
      // Dynamic import avoids loading 'fs' in serverless environments
      const { writeDebate } = await import('../server/lib/vaultWriter.js');
      const filePath = writeDebate(debateData);
      return { success: true, path: filePath };
    } else {
      const { saveDebateToSupabase } = await import('../server/lib/supabase.js');
      const record = await saveDebateToSupabase(debateData);
      return { success: true, id: record.id };
    }
  } catch (err) {
    // Log but swallow the error — storage failing shouldn't crash the debate
    console.error('[storageAdapter] Storage failed:', err.message);
    return { success: false, error: err.message };
  }
}
