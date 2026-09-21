import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('../admin/assets', import.meta.url)),
    emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL('./main.tsx', import.meta.url)), name: 'FinbookAdmin', formats: ['iife'], fileName: () => 'admin-ui.js', cssFileName: 'admin-ui' },
  },
  css: { postcss: { plugins: [tailwindcss({ content: [fileURLToPath(new URL('./main.tsx', import.meta.url))], corePlugins: { preflight: false } }), autoprefixer()] } },
});
