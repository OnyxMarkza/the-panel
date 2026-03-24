import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load .env before any other imports that touch process.env.
// Note: static imports are hoisted in ESM, so dotenv.config() here runs
// AFTER groq.js and vaultWriter.js have already initialised -- those files
// must load dotenv themselves with an explicit path. This call here covers
// any code below that reads process.env at runtime (e.g. PORT).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import personasRouter from './routes/personas.js';
import debateRouter from './routes/debate.js';
import summariseRouter from './routes/summarise.js';
import obsidianRouter from './routes/obsidian.js';
import debatesRouter from './routes/debates.js';
import storageRouter from './routes/storage.js';

const app = express();
const PORT = 3001;

// Enable CORS for local dev (Vite runs on 5173)
app.use(cors({ origin: 'http://localhost:5173' }));

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// Rate limiting for persona generation (prevents API abuse)
const personaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: {
    error: true,
    message: 'Too many persona generation requests. Please wait 5 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mount route handlers
app.use('/api', personasRouter);
app.use('/api', debateRouter);
app.use('/api', summariseRouter);
app.use('/api', obsidianRouter);
app.use('/api', debatesRouter);
app.use('/api', storageRouter);

// Apply rate limiting specifically to persona generation
app.use('/api/generate-personas', personaLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'The Panel server is running.' });
});

app.listen(PORT, () => {
  console.log(`The Panel server listening on http://localhost:${PORT}`);
});
