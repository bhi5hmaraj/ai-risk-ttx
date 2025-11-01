#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const isMock = args.includes('--mock-llm') || args.includes('--mock') || args.includes('--llm-mode=mock');

// Strip our custom flags before forwarding to Next.js
const forward = args.filter(
  (a) => a !== '--mock-llm' && a !== '--mock' && a !== '--llm-mode=mock'
);

const env = { ...process.env };
if (isMock) {
  env.LLM_MOCK = '1';
  env.LLM_MODE = 'mock';
  console.log('[dev] Mock LLM mode enabled');
}

const child = spawn('next', ['dev', ...forward], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));

