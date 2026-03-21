import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run in Node.js — no browser DOM needed for backend utility tests
    environment: 'node',
  },
});
