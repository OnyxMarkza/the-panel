import { saveBattle } from '../shared/storageAdapter.js';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed.' });
  }

  const { topic, personas, history, summary, verdict } = req.body;

  if (!topic || !history || !summary) {
    return res.status(400).json({
      error: true,
      message: 'topic, history, and summary are required.',
    });
  }

  // saveBattle never throws — storage failures are returned as { success: false }
  const result = await saveBattle({ topic, personas, history, summary, verdict });

  return res.status(200).json(result);
}
