// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@astrojs/react';
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
  integrations: [checkpointsCacheGuard, react()],
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
    },
  },
});
