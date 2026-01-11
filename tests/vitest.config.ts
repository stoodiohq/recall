import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        '../mcp/src/**/*.ts',
        '../api/src/**/*.ts',
        '../cli/src/**/*.ts',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests in parallel by default
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@mcp': path.resolve(__dirname, '../mcp/src'),
      '@api': path.resolve(__dirname, '../api/src'),
      '@cli': path.resolve(__dirname, '../cli/src'),
      '@fixtures': path.resolve(__dirname, './fixtures'),
      '@utils': path.resolve(__dirname, './utils'),
    },
  },
});
