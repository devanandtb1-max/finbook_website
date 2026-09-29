import { defineConfig, Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

function syncAdminAssetsPlugin(): Plugin {
  return {
    name: 'sync-admin-assets',
    closeBundle() {
      const adminAssetsDir = fileURLToPath(new URL('../admin/assets', import.meta.url));
      const publicAdminAssetsDir = fileURLToPath(new URL('../public/admin/assets', import.meta.url));
      
      mkdirSync(adminAssetsDir, { recursive: true });
      mkdirSync(publicAdminAssetsDir, { recursive: true });

      const files = ['admin-ui.js', 'admin-ui.css'];
      for (const file of files) {
        const srcPath = resolve(adminAssetsDir, file);
        const destPath = resolve(publicAdminAssetsDir, file);
        if (existsSync(srcPath)) {
          copyFileSync(srcPath, destPath);
        }
      }
    }
  };
}

export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('../admin/assets', import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./main.tsx', import.meta.url)),
      name: 'FinbookAdmin',
      formats: ['iife'],
      fileName: () => 'admin-ui.js',
      cssFileName: 'admin-ui'
    },
  },
  plugins: [syncAdminAssetsPlugin()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [fileURLToPath(new URL('./main.tsx', import.meta.url))],
          corePlugins: { preflight: false }
        }),
        autoprefixer()
      ]
    }
  },
});
