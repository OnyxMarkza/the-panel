import { Router } from 'express';
import { saveBattle } from '../../shared/storageAdapter.js';

const router = Router();

/**
 * POST /api/save-to-database
 * Express mirror of the Vercel serverless endpoint in api/save-to-database.js.
 */
router.post('/save-to-database', async (req, res) => {
  const { topic, personas, history, summary, verdict } = req.body;

  if (!topic || !history || !summary) {
    return res.status(400).json({
      error: true,
      message: 'topic, history, and summary are required.',
    });
  }

  const result = await saveBattle({ topic, personas, history, summary, verdict });
  return res.status(200).json(result);
});

export default router;
