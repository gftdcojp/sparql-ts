/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    watch: false,
  },
  resolve: {
    alias: {
      '@gftdcojp/resourcebox': path.resolve(__dirname, 'src/__mocks__/@gftdcojp/resourcebox.ts'),
    },
  },
});
