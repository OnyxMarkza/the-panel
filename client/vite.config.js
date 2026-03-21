import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',  // index.html lives in client/, resolve from project root
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward all /api requests to the Express server during local dev
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Explicit outDir so intent is clear: output lands in client/dist,
    // which is what vercel.json's "outputDirectory" points to.
    outDir: 'dist',
  },
});
