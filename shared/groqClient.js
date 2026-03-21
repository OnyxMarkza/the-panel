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
 * @param {number} timeoutMs - Abort the request if no response within this time (default 30000)
 * @returns {Promise<string>}
 */
export async function callGroq(messages, maxTokens = 1024, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return completion.choices[0]?.message?.content ?? '';
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Groq request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
