import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

/**
 * Known route slugs to pre-generate static directories for on GitHub Pages.
 * Ensures direct browser navigation returns HTTP 200 directly.
 */
const PREGEN_SLUGS = [
  'Github',
  'github',
  'LinkedIn',
  'linkedin',
  'Portfolio',
  'portfolio',
  'Resume',
  'resume',
];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'github-pages-spa-generator',
      closeBundle() {
        const distDir = path.resolve(__dirname, 'dist');
        const indexPath = path.resolve(distDir, 'index.html');
        const notFoundPath = path.resolve(distDir, '404.html');

        if (fs.existsSync(indexPath)) {
          // 1. Create 404.html SPA fallback
          fs.copyFileSync(indexPath, notFoundPath);

          // 2. Generate static route directories for known slugs to ensure direct navigation HTTP 200
          for (const slug of PREGEN_SLUGS) {
            const slugDir = path.resolve(distDir, slug);
            if (!fs.existsSync(slugDir)) {
              fs.mkdirSync(slugDir, { recursive: true });
            }
            fs.copyFileSync(indexPath, path.resolve(slugDir, 'index.html'));
          }
        }
      },
    },
  ],
  base: '/',
  server: {
    port: 3000,
    host: true,
  },
});
