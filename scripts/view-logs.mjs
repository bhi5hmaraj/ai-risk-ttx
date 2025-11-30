#!/usr/bin/env node
/**
 * View merged client and server logs sorted by timestamp
 * Usage: node scripts/view-logs.mjs [--follow] [--date YYYY-MM-DD]
 */

import { readFileSync, existsSync, watchFile } from 'fs';
import { join } from 'path';

const HELP_TEXT = `
📊 Log Viewer - Merge and view client + server logs

USAGE:
  pnpm run logs:view [OPTIONS]
  node scripts/view-logs.mjs [OPTIONS]

OPTIONS:
  --help, -h              Show this help message
  --follow, -f            Watch logs in real-time (refreshes every 500ms)
  --tag TAG, -t TAG       View logs with specific tag
  --list                  List all available log tags
  --date YYYY-MM-DD, -d   View logs from a specific date (default: today, ignored if --tag is used)

EXAMPLES:
  pnpm run logs:view                          # View today's logs
  pnpm run logs:view --follow                 # Watch today's logs in real-time
  pnpm run logs:view --tag fix-auth           # View logs tagged "fix-auth"
  pnpm run logs:view --tag 2025-11-29T15-30-00  # View logs with timestamp tag
  pnpm run logs:view --list                   # List all available log sessions
  pnpm run logs:view --date 2025-01-15        # View logs from Jan 15, 2025
  pnpm run logs:follow                        # Shortcut for --follow mode

LOG DETAILS:
  The viewer merges two log sources sorted by timestamp:

  🖥️  SERVER LOGS (/tmp/server-logs-YYYY-MM-DD.log)
      - Colyseus WebSocket events (join, leave, messages)
      - Game state changes (phase transitions, round updates)
      - LLM API calls and responses
      - Database operations
      - Error traces with stack info

  🌐 CLIENT LOGS (/tmp/browser-logs-YYYY-MM-DD.log)
      - React component lifecycle
      - User interactions (clicks, form submissions)
      - WebSocket connection status
      - State management updates (Zustand stores)
      - Client-side errors and warnings

  Each log entry shows:
    - Timestamp (HH:MM:SS.mmm)
    - Source indicator (🖥️ server or 🌐 client)
    - Log level (INFO, WARN, ERROR, DEBUG)
    - Message
    - Additional structured data (if present)

DATA TRUNCATION:
  Large objects are automatically truncated to prevent log pollution:
  - Strings: Max 500 characters
  - Arrays: First 5 items shown
  - Objects: Max 20 keys, max 3 levels deep
  - Indicators show when data is truncated ([...N more items])

NOTES:
  - Enable file logging with: pnpm run dev --logs
  - No environment variables needed - the --logs flag handles everything
  - Press Ctrl+C to exit follow mode
`;

import { readdirSync, statSync } from 'fs';

const args = process.argv.slice(2);

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(HELP_TEXT);
  process.exit(0);
}

// List available tags
if (args.includes('--list')) {
  console.log('\n📋 Available Log Sessions:\n');
  try {
    const files = readdirSync('/tmp');
    const serverLogs = files.filter(f => f.startsWith('server-logs-') && f.endsWith('.log'));
    const browserLogs = files.filter(f => f.startsWith('browser-logs-') && f.endsWith('.log'));

    const tags = new Set();
    serverLogs.forEach(f => tags.add(f.replace('server-logs-', '').replace('.log', '')));
    browserLogs.forEach(f => tags.add(f.replace('browser-logs-', '').replace('.log', '')));

    const tagList = Array.from(tags).sort().reverse(); // Most recent first

    if (tagList.length === 0) {
      console.log('  No log files found. Run with --logs flag to create logs.\n');
    } else {
      tagList.forEach(tag => {
        const serverFile = join('/tmp', `server-logs-${tag}.log`);
        const browserFile = join('/tmp', `browser-logs-${tag}.log`);
        const hasServer = existsSync(serverFile);
        const hasBrowser = existsSync(browserFile);
        const size = (hasServer ? statSync(serverFile).size : 0) + (hasBrowser ? statSync(browserFile).size : 0);
        const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;

        console.log(`  ${tag} (${sizeStr}) [${hasServer ? '🖥️ ' : ''}${hasBrowser ? '🌐' : ''}]`);
      });
      console.log(`\n  Total sessions: ${tagList.length}\n`);
    }
  } catch (err) {
    console.error('Error listing logs:', err.message);
  }
  process.exit(0);
}

const followMode = args.includes('--follow') || args.includes('-f');
const tagIdx = args.findIndex(a => a === '--tag' || a === '-t');
const dateIdx = args.findIndex(a => a === '--date' || a === '-d');

// Determine target tag/date
let targetTag;
if (tagIdx !== -1 && args[tagIdx + 1]) {
  targetTag = args[tagIdx + 1];
} else if (dateIdx !== -1 && args[dateIdx + 1]) {
  targetTag = args[dateIdx + 1];
} else {
  targetTag = new Date().toISOString().split('T')[0];
}

const serverLogFile = join('/tmp', `server-logs-${targetTag}.log`);
const browserLogFile = join('/tmp', `browser-logs-${targetTag}.log`);

function parseLine(line, source) {
  try {
    const data = JSON.parse(line);
    const timestamp = data.timestamp || data.time || data.receivedAt || new Date().toISOString();
    return {
      timestamp: new Date(timestamp),
      source,
      data,
      raw: line
    };
  } catch {
    return null;
  }
}

function readAndMergeLogs() {
  const entries = [];

  // Read server logs
  if (existsSync(serverLogFile)) {
    const serverLines = readFileSync(serverLogFile, 'utf-8').split('\n').filter(Boolean);
    serverLines.forEach(line => {
      const entry = parseLine(line, 'SERVER');
      if (entry) entries.push(entry);
    });
  }

  // Read browser logs
  if (existsSync(browserLogFile)) {
    const browserLines = readFileSync(browserLogFile, 'utf-8').split('\n').filter(Boolean);
    browserLines.forEach(line => {
      const entry = parseLine(line, 'CLIENT');
      if (entry) entries.push(entry);
    });
  }

  // Sort by timestamp
  entries.sort((a, b) => a.timestamp - b.timestamp);

  return entries;
}

function displayLogs(entries) {
  console.clear();
  console.log(`\n📊 Merged Logs for: ${targetTag}\n`);
  console.log(`Server: ${serverLogFile}`);
  console.log(`Client: ${browserLogFile}\n`);
  console.log('═'.repeat(100) + '\n');

  entries.forEach(entry => {
    const time = entry.timestamp.toISOString().split('T')[1];
    const source = entry.source === 'SERVER' ? '🖥️ ' : '🌐';

    // Handle Pino's numeric log levels (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal)
    const rawLevel = entry.data.level || entry.data.lvl || 30;
    const levelMap = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO', 40: 'WARN', 50: 'ERROR', 60: 'FATAL' };
    const level = typeof rawLevel === 'number' ? (levelMap[rawLevel] || 'INFO') : String(rawLevel).toUpperCase();

    const msg = entry.data.msg || entry.data.message || '';

    console.log(`${time} ${source} [${level}] ${msg}`);

    // Show additional data if present
    const dataFields = { ...entry.data };
    delete dataFields.timestamp;
    delete dataFields.time;
    delete dataFields.receivedAt;
    delete dataFields.level;
    delete dataFields.lvl;
    delete dataFields.msg;
    delete dataFields.message;
    delete dataFields.url;
    delete dataFields.pid;
    delete dataFields.hostname;

    if (Object.keys(dataFields).length > 0) {
      console.log('  ', JSON.stringify(dataFields, null, 2).split('\n').join('\n   '));
    }
    console.log('');
  });
}

// Initial display
let entries = readAndMergeLogs();
displayLogs(entries);

if (followMode) {
  console.log('👀 Watching for changes... (Ctrl+C to exit)\n');

  // Watch both files
  if (existsSync(serverLogFile)) {
    watchFile(serverLogFile, { interval: 500 }, () => {
      entries = readAndMergeLogs();
      displayLogs(entries);
    });
  }

  if (existsSync(browserLogFile)) {
    watchFile(browserLogFile, { interval: 500 }, () => {
      entries = readAndMergeLogs();
      displayLogs(entries);
    });
  }
} else {
  console.log('\n💡 Tip: Use --follow to watch logs in real-time');
  console.log('💡 Tip: Use --date YYYY-MM-DD to view logs from a specific date\n');
}
