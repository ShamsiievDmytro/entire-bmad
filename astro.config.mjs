// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';

/** @type {import('astro').AstroIntegration} */
const checkpointsCacheGuard = {
  name: 'checkpoints-cache-guard',
  hooks: {
    'astro:config:setup': ({ command }) => {
      if (command === 'build' && !existsSync(resolve('./src/data/checkpoints-cache.json'))) {
        throw new Error(
          'ERROR: src/data/checkpoints-cache.json not found. Run: npm run fetch-checkpoints'
        );
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  integrations: [checkpointsCacheGuard],
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  }
});
