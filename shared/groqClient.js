import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// In serverless environments (e.g. Vercel), env vars are injected by the platform.
// In local dev, we load from the .env file at the project root.
// We try both but don't fail if neither file is present.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Call the Groq API with a messages array.
 * Returns the content string of the first completion choice.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {number} maxTokens - Token limit (default 1024)
 * @param {number} timeoutMs - Timeout in milliseconds (default 30000)
 * @returns {Promise<string>}
 */
export async function callGroq(messages, maxTokens = 1024, timeoutMs = 30000) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  // The Groq SDK (v0.8.x) does not support passing AbortController's `signal`
  // in request payloads. Implement timeout client-side with Promise.race.
  const completionPromise = groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: maxTokens,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Groq request timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  const completion = await Promise.race([completionPromise, timeoutPromise]);
  return completion.choices[0]?.message?.content ?? '';
}
