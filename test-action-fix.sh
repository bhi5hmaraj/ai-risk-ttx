#!/bin/bash

echo "Testing action selection fix..."
echo ""
echo "Test steps:"
echo "  1. Create room"
echo "  2. Select role with /role 2"
echo "  3. Start game with /start"
echo "  4. Wait for action_options"
echo "  5. Select action with /action 1"
echo "  6. Check if connection stays alive and action is submitted"
echo ""

cd packages/cli

# Start in background and send commands via expect or heredoc
# For now, let's just start the CLI and show the user how to test
pnpm run create &
CLI_PID=$!

echo "CLI started with PID: $CLI_PID"
echo ""
echo "Manual test commands:"
echo "  /role 2"
echo "  /start"
echo "  (wait for action_options)"
echo "  /action 1"
echo ""
echo "Expected: Action should be submitted without connection closing"
echo "Press Ctrl+C to exit"

wait $CLI_PID
