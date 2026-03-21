import { Router } from 'express';
import { writeDebate } from '../lib/vaultWriter.js';
import { saveDebateToSupabase } from '../lib/supabase.js';

const router = Router();

/**
 * POST /api/save-to-obsidian
 * Body: { topic, personas, history, summary, verdict }
 * Returns: { success: true, path: string, debateId: string|null }
 *
 * Writes the debate to the Obsidian vault, then ALSO saves it to Supabase.
 * Supabase is wrapped in its own try/catch so a DB failure never blocks the
 * Obsidian save -- the vault write is the source of truth for now.
 *
 * History format (from /api/debate-round):
 *   [{ persona: string, content: string }, ...]
 * Messages are stored flat; round_number is derived from index and persona count.
 */
router.post('/save-to-obsidian', async (req, res) => {
  // Simple API key authentication
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.SAVE_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({
      error: true,
      message: 'Invalid or missing API key.',
    });
  }

  const { topic, personas, history, summary, verdict } = req.body;

  if (!topic || !personas || !history || !summary) {
    return res.status(400).json({
      error: true,
      message: 'topic, personas, history, and summary are all required.',
    });
  }

  // -------------------------------------------------------------------------
  // Step 1: Write to Obsidian vault (synchronous, same as before)
  // -------------------------------------------------------------------------
  let filePath;
  try {
    filePath = writeDebate({ topic, personas, history, summary, verdict });
  } catch (err) {
    console.error('[obsidian] Vault write error:', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }

  // -------------------------------------------------------------------------
  // Step 2: Save to Supabase (non-blocking on failure)
  // Any error here is logged but does NOT fail the HTTP response.
  // -------------------------------------------------------------------------
  let debateId = null;
  try {
    const result = await saveDebateToSupabase({
      topic, personas, history, summary, verdict,
      obsidianPath: filePath,
    });
    debateId = result.id;
    console.log(`[obsidian] Saved to Supabase: debate ${debateId}`);
  } catch (err) {
    // Log the error but don't let it fail the response -- Obsidian save succeeded.
    console.error('[obsidian] Supabase save error (non-fatal):', err.message);
  }

  // Return the vault path and the Supabase debate ID (null if DB save failed).
  res.json({ success: true, path: filePath, debateId });
});

export default router;
