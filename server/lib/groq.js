import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

// Resolve the .env path relative to THIS file, not the working directory.
// In ESM there is no __dirname, so we derive it from import.meta.url.
// This file lives at server/lib/groq.js, so ../../ is the project root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialise the Groq client with the API key from environment
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Call the Groq API with a messages array.
 * Returns the content string of the first completion choice.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {number} maxTokens - Optional token limit (default 1024)
 * @param {number} timeoutMs - Optional timeout in milliseconds (default 30000)
 * @returns {Promise<string>}
 */
export async function callGroq(messages, maxTokens = 1024, timeoutMs = 30000) {
  // Note: the Groq SDK (v0.8) does not support AbortController's `signal`
  // property directly. Instead we use a simple timeout via Promise.race.
  const completionPromise = groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: maxTokens,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const completion = await Promise.race([completionPromise, timeoutPromise]);
    return completion.choices[0]?.message?.content ?? '';
  } catch (error) {
    throw error;
  }
}
