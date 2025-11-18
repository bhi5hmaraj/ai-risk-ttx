#!/usr/bin/env node
/**
 * Validate Mermaid diagrams embedded in markdown files
 * Uses @a24z/mermaid-parser (lightweight, no Puppeteer)
 */

import { parse } from '@a24z/mermaid-parser';
import { readFileSync } from 'fs';
import { resolve, basename } from 'path';

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('Usage: node validate_mermaid.js <file.md> [file2.md ...]');
  process.exit(1);
}

console.log('======================================');
console.log('Validating Mermaid Diagrams');
console.log('======================================');
console.log();

let totalFiles = 0;
let failedFiles = 0;
let totalBlocks = 0;
let failedBlocks = 0;

for (const file of files) {
  const filePath = resolve(file);
  console.log(`📄 Checking: ${basename(file)}`);

  try {
    const content = readFileSync(filePath, 'utf8');

    // Extract mermaid code blocks
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    const blocks = [];
    let match;

    while ((match = mermaidRegex.exec(content)) !== null) {
      blocks.push(match[1]);
    }

    if (blocks.length === 0) {
      console.log('  ℹ️  No mermaid blocks found');
      console.log();
      continue;
    }

    totalFiles++;
    let fileHasErrors = false;

    blocks.forEach((block, index) => {
      totalBlocks++;
      try {
        parse(block);
        console.log(`  ✅ Block ${index + 1}: Valid`);
      } catch (error) {
        failedBlocks++;
        fileHasErrors = true;
        console.log(`  ❌ Block ${index + 1}: INVALID`);
        console.log(`     Error: ${error.message}`);
        console.log(`     --- First 5 lines ---`);
        block.split('\n').slice(0, 5).forEach(line => {
          console.log(`     ${line}`);
        });
        console.log(`     ...`);
      }
    });

    if (fileHasErrors) {
      failedFiles++;
    }

  } catch (error) {
    console.log(`  ❌ Error reading file: ${error.message}`);
    failedFiles++;
  }

  console.log();
}

console.log('======================================');
console.log('Validation Complete');
console.log('======================================');
console.log(`Files checked: ${totalFiles}`);
console.log(`Files with errors: ${failedFiles}`);
console.log(`Total blocks: ${totalBlocks}`);
console.log(`Failed blocks: ${failedBlocks}`);
console.log();

if (failedBlocks > 0) {
  console.log('❌ Some diagrams have syntax errors!');
  console.log();
  console.log('To fix:');
  console.log('  1. Check error messages above');
  console.log('  2. Test syntax at https://mermaid.live');
  console.log('  3. Update markdown files');
  process.exit(1);
} else {
  console.log('✅ All diagrams are valid!');
  process.exit(0);
}
