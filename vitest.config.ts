import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Ensure vite's cache is outside node_modules for sandboxed environments
  cacheDir: '.vite-temp',
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Run single-threaded in CI/pre-commit to avoid flaky coverage .tmp reads
    // Note: pool options are supported in Vitest v4, but our types lag. Use inline any cast.
    ...( { pool: 'threads', poolOptions: { threads: { maxThreads: 1, minThreads: 1 } } } as any ),
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
    dedupe: ['react', 'react-dom'],
  },
});
