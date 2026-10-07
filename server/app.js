import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import personasRouter from './routes/personas.js';
import debateRouter from './routes/debate.js';
import summariseRouter from './routes/summarise.js';
import obsidianRouter from './routes/obsidian.js';
import debatesRouter from './routes/debates.js';
import storageRouter from './routes/storage.js';
import suggestionsRouter from './routes/suggestions.js';
import {
  requireApiKeyForDebatesMiddleware,
  requireApiKeyMiddleware,
} from '../shared/apiAuth.js';

/**
 * Build the Express app (used by server/index.js and Vitest supertest).
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());

  app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });

    next();
  });

  const personaLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: {
      error: true,
      message: 'Too many persona generation requests. Please wait 5 minutes before trying again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const debateRoundLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: {
      error: true,
      code: 'RATE_LIMIT',
      message: 'Too many debate round requests. Please wait before trying again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const protectedApi = requireApiKeyMiddleware;
  const protectedDebates = requireApiKeyForDebatesMiddleware;

  app.use('/api/generate-personas', personaLimiter, protectedApi);
  app.use('/api/debate-round', debateRoundLimiter, protectedApi);
  app.use('/api/summarise', protectedApi);
  app.use('/api/suggest-topics', protectedApi);
  app.use('/api/save-to-database', protectedApi);
  app.use('/api/debates', protectedDebates);

  app.use('/api', personasRouter);
  app.use('/api', debateRouter);
  app.use('/api', summariseRouter);
  app.use('/api', obsidianRouter);
  app.use('/api', debatesRouter);
  app.use('/api', storageRouter);
  app.use('/api', suggestionsRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'The Panel server is running.' });
  });

  return app;
}
