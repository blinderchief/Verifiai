import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/test/**/*.test.ts', 'apps/**/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/**/src/**/*.ts', 'apps/**/src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/test/**',
        '**/*.d.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 60,
        branches: 60,
        functions: 60,
        statements: 60,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@verifiai/core': resolve(__dirname, './packages/core/src'),
      '@verifiai/proof-engine': resolve(__dirname, './packages/proof-engine/src'),
      '@verifiai/shelby-client': resolve(__dirname, './packages/shelby-client/src'),
      '@verifiai/agent-coordinator': resolve(__dirname, './packages/agent-coordinator/src'),
    },
  },
});
