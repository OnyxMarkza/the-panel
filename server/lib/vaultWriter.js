import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Same pattern as groq.js: resolve path explicitly so it works from any cwd.
// This file lives at server/lib/vaultWriter.js, so ../../ is the project root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Use VAULT_ROOT from .env, fallback to scanning Desktop for .obsidian directory
function resolveVaultRoot() {
  if (process.env.VAULT_ROOT) {
    return process.env.VAULT_ROOT;
  }

  // Scan Desktop for an .obsidian directory as fallback
  const desktop = 'C:/Users/ngmat/OneDrive/Desktop';
  try {
    const entries = fs.readdirSync(desktop, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const candidate = path.join(desktop, entry.name);
        if (fs.existsSync(path.join(candidate, '.obsidian'))) {
          console.log(`[vaultWriter] Found vault at: ${candidate}`);
          return candidate;
        }
      }
    }
  } catch (err) {
    console.error('[vaultWriter] Error scanning Desktop:', err.message);
  }

  throw new Error('Could not locate Obsidian vault. Set VAULT_ROOT in .env');
}

const VAULT_ROOT = resolveVaultRoot();
const DEBATES_DIR = path.join(VAULT_ROOT, 'Claude Projects', 'the-panel', 'debates');

// Ensure the debates directory exists
fs.mkdirSync(DEBATES_DIR, { recursive: true });

/**
 * Convert a topic string into a URL-friendly slug.
 * e.g. "Should AI replace doctors?" -> "should-ai-replace-doctors"
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

/**
 * Write the full debate to the Obsidian vault as a Markdown file.
 *
 * @param {Object} params
 * @param {string} params.topic
 * @param {Array} params.personas - Array of { name, archetype, bias, tone }
 * @param {Array} params.history - Array of { persona, content }
 * @param {string} params.summary
 * @param {string} params.verdict
 * @returns {string} - Path to the written file
 */
export function writeDebate({ topic, personas, history, summary, verdict }) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const slug = slugify(topic);
  const filename = `${today}-${slug}.md`;
  const filepath = path.join(DEBATES_DIR, filename);

  const personaList = personas
    .map(p => `- **${p.name}** — *${p.archetype}* | Bias: ${p.bias} | Tone: ${p.tone}`)
    .join('\n');

  const transcript = history
    .map(msg => `**${msg.persona}:** ${msg.content}`)
    .join('\n\n---\n\n');

  const markdown = `---
title: "${topic}"
date: ${today}
tags: [the-panel, debate, ai]
---

# 🎭 The Panel: ${topic}

## 🧑‍🤝‍🧑 Panellists

${personaList}

---

## 💬 Debate Transcript

${transcript}

---

## 🧾 Summary

${summary}

## ⚖️ Verdict

${verdict}
`;

  fs.writeFileSync(filepath, markdown, 'utf8');
  console.log(`[vaultWriter] Debate saved to: ${filepath}`);
  return filepath;
}
