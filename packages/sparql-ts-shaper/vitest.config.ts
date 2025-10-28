/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    watch: false,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@gftdcojp/resourcebox': path.resolve(__dirname, 'src/__mocks__/@gftdcojp/resourcebox.ts'),
    },
  },
});
