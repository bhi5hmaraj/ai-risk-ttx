#!/bin/bash

# Test script for simplified CLI commands
# This simulates user input to test /role <number> and /start commands

cd "$(dirname "$0")/packages/cli"

echo "Testing simplified CLI commands..."
echo ""
echo "Commands to test:"
echo "  1. Create room (auto)"
echo "  2. Wait for players_init message"
echo "  3. Select role with: /role 2"
echo "  4. Start game with: /start"
echo ""

# Simulate user input: create room, select role 2, start game, then exit
(
  sleep 3    # Wait for room creation and players_init
  echo "/role 2"
  sleep 2
  echo "/start"
  sleep 2
  echo "state"
  sleep 2
  echo "exit"
) | pnpm run create 2>&1 | tee /tmp/cli-simplified-test.log

echo ""
echo "Test complete. Check /tmp/cli-simplified-test.log for results"
echo ""
echo "Expected behavior:"
echo "  ✓ Room created successfully"
echo "  ✓ Available roles displayed with numbers"
echo "  ✓ /role 2 selects second role"
echo "  ✓ /start starts the game without errors"
