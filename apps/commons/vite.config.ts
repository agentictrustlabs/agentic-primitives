import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The SPA builds to `dist/client`, which `wrangler.toml` serves through the ASSETS binding.
// One artifact, one deploy — there is no second hosting product in this stack.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
