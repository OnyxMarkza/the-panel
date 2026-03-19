# The Panel

A multi-agent AI debate application. Enter a topic, and five distinct AI personas will convene, debate across three rounds, and produce a moderated synthesis — all saved to your Obsidian vault.

## What it does

1. **Topic input** — You provide a debate topic.
2. **Persona generation** — Groq generates 5 unique panellists with distinct worldviews, biases, and tones.
3. **Three debate rounds** — Each persona speaks sequentially, seeing what all prior speakers have said.
4. **Synthesis** — A neutral moderator summarises the debate and delivers a verdict.
5. **Obsidian export** — The full debate is saved as a Markdown file to your vault.

## Tech stack

- **Frontend**: React 18, Vite 5, custom CSS (no UI library)
- **Backend**: Express 4, Node 18+
- **AI**: Groq API, LLaMA 3.3 70B Versatile
- **Storage**: Obsidian vault (local Markdown file)

## Setup

```bash
# Install dependencies
npm install

# Start development server (client + server concurrently)
npm run dev
```

The app runs at `http://localhost:5173`. The Express API runs on port 3001.

## Environment variables

Create a `.env` file in the project root:

```
GROQ_API_KEY=your_key_here
VAULT_ROOT=C:/Users/ngmat/OneDrive/Desktop/Obsidian vault
```

## Debates are saved to

```
Obsidian vault/Claude Projects/the-panel/debates/YYYY-MM-DD-slug.md
```
