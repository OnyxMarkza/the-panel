import { Router } from 'express';
import { writeDebate } from '../lib/vaultWriter.js';
import { saveDebateToSupabase } from '../lib/supabase.js';

const router = Router();
const DEFAULT_PERSONA_COUNT = 5;

function normalizeCount(input) {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isInteger(parsed)) return DEFAULT_PERSONA_COUNT;
  return Math.min(Math.max(parsed, 3), 7);
}

router.post('/save-to-obsidian', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.SAVE_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({
      error: true,
      code: 'AUTH_ERROR',
      message: 'Invalid or missing API key.',
    });
  }

  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
  const personas = Array.isArray(req.body?.personas) ? req.body.personas : [];
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
  const verdict = typeof req.body?.verdict === 'string' ? req.body.verdict.trim() : '';
  const personaCount = normalizeCount(req.body?.persona_count ?? personas.length);

  if (!topic || personas.length === 0 || history.length === 0 || !summary) {
    return res.status(400).json({
      error: true,
      code: 'VALIDATION_ERROR',
      message: 'topic, personas, history, and summary are all required.',
    });
  }

  let filePath;
  try {
    filePath = writeDebate({ topic, personas, history, summary, verdict });
  } catch (err) {
    console.error('[obsidian] Vault write error:', err.message);
    return res.status(500).json({ error: true, code: 'VAULT_WRITE_ERROR', message: err.message });
  }

  let debateId = null;
  try {
    const result = await saveDebateToSupabase({
      topic,
      personas,
      history,
      summary,
      verdict,
      obsidianPath: filePath,
      personaCount,
    });
    debateId = result.id;
    console.log(`[obsidian] Saved to Supabase: debate ${debateId}`);
  } catch (err) {
    console.error('[obsidian] Supabase save error (non-fatal):', err.message);
  }

  return res.json({ success: true, path: filePath, debateId, persona_count: personaCount });
});

export default router;
