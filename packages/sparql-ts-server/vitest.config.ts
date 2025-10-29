/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    watch: false,
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', 'src/index.ts'],
    },
  },
});


