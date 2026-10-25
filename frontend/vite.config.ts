import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Relative base keeps the build working under a GitHub Pages sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {outDir: 'dist', emptyOutDir: true}
});
