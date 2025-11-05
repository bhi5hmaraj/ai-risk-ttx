#!/usr/bin/env node
import { startVitest } from 'vitest/node'
import path from 'path'

const root = process.cwd()
const argv = process.argv.slice(2)

// Extract CLI flags vs file/name patterns
const cliFlags = argv.filter(a => a.startsWith('--'))
const patterns = argv.filter(a => !a.startsWith('--'))

// Reporter flag support (e.g., --reporter=verbose)
let reporters = undefined
const repFlag = cliFlags.find(a => a.startsWith('--reporter='))
if (repFlag) reporters = repFlag.split('=')[1] || 'default'

// Run Vitest with an inline config to avoid Vite bundling the config file
// (which writes transient files into node_modules/.vite*). This keeps all
// caches in a workspace-writable directory.
const inlineConfig = {
  configFile: false,
  root,
  cacheDir: '.vitest-cache',
  resolve: {
    alias: {
      '@': path.resolve(root, './'),
      '@api': path.resolve(root, './api'),
      '@services': path.resolve(root, './services'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(root, './tests/setup.ts')],
    include: [
      'tests/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'lib/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'server/**/*.{test,spec}.?(c|m)[jt]s?(x)'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.config.ts', 'tests/'],
    },
  },
}

await startVitest('run', patterns.length ? patterns : undefined, reporters ? { ...inlineConfig, reporters } : inlineConfig)
