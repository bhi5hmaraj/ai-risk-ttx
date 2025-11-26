#!/usr/bin/env node
/*
  Updates README.md with the latest Vitest coverage metrics.
  - Reads coverage/coverage-final.json (V8)
  - Computes summary via istanbul-lib-coverage
  - Replaces content between <!-- COVERAGE_START --> and <!-- COVERAGE_END -->
*/

import fs from 'node:fs';
import path from 'node:path';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function upsertBlock(readme, block) {
  const start = '<!-- COVERAGE_START -->';
  const end = '<!-- COVERAGE_END -->';
  const startIdx = readme.indexOf(start);
  const endIdx = readme.indexOf(end);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return readme.slice(0, startIdx) + block + readme.slice(endIdx + end.length);
  }
  // Insert before Project Status section if markers not found
  const anchor = '\n## Project Status & Issue Tracking';
  const anchorIdx = readme.indexOf(anchor);
  const insertion = block + '\n\n';
  if (anchorIdx !== -1) {
    return readme.slice(0, anchorIdx) + insertion + readme.slice(anchorIdx);
  }
  // Append to end as fallback
  return readme.trimEnd() + '\n\n' + insertion;
}

async function main() {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const coveragePath = path.join(repoRoot, 'coverage', 'coverage-final.json');

  const covJson = readJson(coveragePath);
  if (!covJson) {
    console.error(`[coverage-readme] Missing coverage file: ${coveragePath}`);
    process.exit(1);
  }

  // Lazy import istanbul-lib-coverage
  const covLib = await import('istanbul-lib-coverage');
  const createCoverageMap = covLib.createCoverageMap || covLib.default?.createCoverageMap;
  if (!createCoverageMap) {
    throw new Error('istanbul-lib-coverage not available');
  }
  const map = createCoverageMap(covJson);
  const summary = map.getCoverageSummary();
  const pct = (m) => Number((summary[m].pct ?? 0)).toFixed(1);

  const now = new Date();
  const stamp = now.toISOString().replace('T', ' ').slice(0, 16) + 'Z';

  const block = `<!-- COVERAGE_START -->\n\n## Test Coverage\n\nLast updated: ${stamp}\n\n| Metric | Percent |\n| - | - |\n| Statements | ${pct('statements')}% |\n| Branches | ${pct('branches')}% |\n| Functions | ${pct('functions')}% |\n| Lines | ${pct('lines')}% |\n\nRun npm run metrics to regenerate.\n\n<!-- COVERAGE_END -->`;

  const readmePath = path.join(repoRoot, 'README.md');
  const current = fs.readFileSync(readmePath, 'utf8');
  const updated = upsertBlock(current, block);
  if (updated !== current) {
    fs.writeFileSync(readmePath, updated);
    console.log('[coverage-readme] README updated');
  } else {
    console.log('[coverage-readme] README unchanged');
  }
}

main().catch((err) => {
  console.error('[coverage-readme] Failed:', err);
  process.exit(1);
});
