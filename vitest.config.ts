import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Run single-threaded in CI/pre-commit to avoid flaky coverage .tmp reads
    // @ts-expect-error Vitest v4 pool options not reflected in our InlineConfig typing
    pool: 'threads',
    // @ts-expect-error Vitest v4 pool options not reflected in our InlineConfig typing
    poolOptions: { threads: { maxThreads: 1, minThreads: 1 } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        'tests/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@api': path.resolve(__dirname, './api'),
      '@services': path.resolve(__dirname, './services'),
    },
  },
});
