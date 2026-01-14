#!/bin/bash

cd /home/bhishma/Documents/code/ai-risk-ttx-simulacra_v1

echo "===== Testing Action Selection Fix ====="
echo ""
echo "Starting Colyseus server..."

# Kill any existing server
lsof -ti:3004 | xargs kill -9 2>/dev/null
sleep 2

# Start server in background
PORT=3004 pnpm run dev:colyseus > /tmp/action-test-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
sleep 5

echo ""
echo "Starting CLI test..."
echo ""

# Send commands to CLI via stdin
{
  sleep 2
  echo "/role 2"
  sleep 2
  echo "/start"
  sleep 8  # Wait for LLM to generate scenario and action options
  echo "/action 1"
  sleep 3
  echo "state"
  sleep 2
  echo "exit"
} | pnpm --filter @simulacra/cli run create 2>&1 | tee /tmp/action-test-cli.log

echo ""
echo "===== Test Results ====="
echo ""
echo "Check /tmp/action-test-cli.log for CLI output"
echo "Check /tmp/action-test-server.log for server output"
echo ""
echo "Expected behavior:"
echo "  ✓ Connection should NOT close with code 4002 after /action 1"
echo "  ✓ Action should be submitted successfully"
echo "  ✓ Player should see 'Action submitted' or similar confirmation"
echo ""

# Check for errors in the logs
if grep -q "Left room with code: 4002" /tmp/action-test-cli.log; then
  echo "❌ FAILED: Connection closed with code 4002"
  echo ""
  grep "Left room with code" /tmp/action-test-cli.log
else
  echo "✅ PASSED: No connection error detected"
fi

if grep -q "submit_action" /tmp/action-test-cli.log; then
  echo "✅ PASSED: submit_action message sent"
  echo ""
  grep -A 5 "submit_action" /tmp/action-test-cli.log
else
  echo "⚠️  WARNING: submit_action not found in logs"
fi

# Clean up
kill $SERVER_PID 2>/dev/null

echo ""
echo "Test complete!"
