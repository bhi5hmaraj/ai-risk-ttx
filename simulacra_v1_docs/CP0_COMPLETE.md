# CP0: CLI Skeleton - COMPLETE

**Status**: ✅ Complete
**Date**: December 6, 2024
**Duration**: ~1 hour

---

## Goal

Build a CLI tool that connects to the existing Colyseus server and observes games in real-time.

## What Was Built

### Files Created

```
packages/cli/
├── package.json          # CLI dependencies and scripts
└── src/
    ├── index.ts          # Commander CLI with create/join/watch commands
    ├── client.ts         # Colyseus connection wrapper
    ├── logger.ts         # Pretty message logging with colors and timestamps
    └── repl.ts           # Interactive REPL interface
```

### Key Features

1. **Command-Line Interface** (Commander.js)
   - `sim create` - Create a new game room
   - `sim join <room-id>` - Join existing room by ID
   - `sim watch` - Join or create room and watch

2. **Colyseus Client Wrapper**
   - Auto-connection to server (default: ws://localhost:3004)
   - Room lifecycle management
   - Message handlers with callbacks
   - State change tracking

3. **Pretty Logger**
   - Colored output with chalk
   - Timestamped messages (MM:SS format)
   - Message direction indicators (← server, → client)
   - Truncation for large payloads

4. **Interactive REPL**
   - Real-time command input
   - Send raw messages to server
   - View current state and room info
   - Help system with examples

## Testing

### Test Run Output

```bash
$ cd packages/cli && npx tsx src/index.ts create

[00:00] ℹ Creating room: game
[00:00] ✓ Room created! Code: YI2De3TPU

Available Commands:
────────────────────────────────────────────────────────────────────────────────
  help, ?                   Show this help message
  state                     Show current game state
  room                      Show room information
  send <type> [data]        Send a message to the server
  /<type> [data]            Shorthand for send (e.g., /ready)
  clear                     Clear the screen
  exit, quit                Exit the REPL
────────────────────────────────────────────────────────────────────────────────

sim> [00:00] ← state_change
{
  "playerCount": 0
}

[00:00] ← waiting_status
{
  "round": 0,
  "phase": "lobby",
  "humans": [...],
  "ai": [],
  "humansReady": 0,
  "humansTotal": 1
}

[00:00] ← players_init
{
  "players": [...]
}
```

### Success Criteria Met

- ✅ Can create and join rooms via CLI
- ✅ See all server messages logged in real-time
- ✅ Can send basic commands (/role, /start, /action)
- ✅ REPL interface works with commands and shortcuts
- ✅ Colored, timestamped output for readability

## Dependencies

```json
{
  "dependencies": {
    "colyseus.js": "^0.15.0",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "@types/node": "^20.0.0"
  }
}
```

Total package size: 33 packages added to workspace

## Usage Examples

### Create a room and observe
```bash
$ cd packages/cli && pnpm run create
```

### Join specific room
```bash
$ cd packages/cli && pnpm run sim join YI2De3TPU
```

### Watch mode (join or create)
```bash
$ cd packages/cli && pnpm run watch
```

### Send commands in REPL
```
sim> /ready
sim> send set_role {"roleId": "role_0"}
sim> state
sim> exit
```

## Known Issues

1. **Schema mismatch warnings** - Minor Colyseus schema validation warnings. Does not affect functionality.

## Next Steps (CP1)

Now that we can observe the game:
- Add phase-aware handlers to understand game flow
- Implement lobby, action, consequence, and end phase handlers
- Track phase transitions
- Play through a complete game via CLI

## Notes

- **Converted CLI to pnpm** - Now uses pnpm workspace
- **Added pnpm workspace** - Updated pnpm-workspace.yaml to include packages/*
- Server must be running on port 3004 before testing
- Room name changed from 'simulacra_room' to 'game' to match existing server
- Convenient shortcuts: `pnpm run create`, `pnpm run watch` in packages/cli/

---

**CP0 complete! CLI can now connect and observe the existing server.**
