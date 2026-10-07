import { saveBattle } from '../shared/storageAdapter.js';
import { enforceApiKeyForVercel } from '../shared/apiAuth.js';
import { handleVercelOptions, setVercelCors } from '../shared/vercelCors.js';

/**
 * Vercel serverless function: POST /api/save-to-database
 *
 * Saves the completed debate via the storage adapter.
 *   - Local dev (LOCAL_STORAGE=true): writes to Obsidian vault
 *   - Production (Vercel): saves to Supabase
 *
 * Returns { success: true, id } or { success: true, path } on success.
 * Returns { success: false, error } if storage fails (does not 500 — the debate
 * is already complete; saving is best-effort).
 */
export default async function handler(req, res) {
  setVercelCors(req, res);
  if (handleVercelOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  if (!enforceApiKeyForVercel(req, res)) return;

  const { topic, personas, history, summary, verdict, persona_count } = req.body;

  if (!topic || !history || !summary) {
    return res.status(400).json({
      error: true,
      message: 'topic, history, and summary are required.',
    });
  }

  const result = await saveBattle({
    topic,
    personas,
    history,
    summary,
    verdict,
    persona_count,
  });

  return res.status(200).json(result);
}
