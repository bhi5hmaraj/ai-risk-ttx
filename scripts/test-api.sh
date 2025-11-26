#!/bin/bash

# Test script for LLM API endpoints
# Usage: ./scripts/test-api.sh

set -e

echo "=== Testing LLM Backend API ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

trap '[[ -n "${SERVER_PID:-}" ]] && kill $SERVER_PID 2>/dev/null || true' EXIT INT TERM

# Kill existing processes
echo "1. Cleaning up existing processes..."
pkill -9 -f "vercel dev" 2>/dev/null || true
sleep 1

# Config
LOG_FILE="${LOG_FILE:-.vercel-api-test.log}"
PORT="${PORT:-3003}"
LISTEN_ADDR="127.0.0.1:${PORT}"

# Choose vercel command (prefer local, fallback to npx)
if command -v vercel >/dev/null 2>&1; then
  VERCEL_CMD="vercel"
else
  VERCEL_CMD="npx -y vercel@latest"
fi

# Try Vercel dev server in background on a fixed port
echo "2. Starting Vercel dev server on ${LISTEN_ADDR}..."
# Prepare log file if writable; otherwise fall back to /dev/null
if [ ! -w "." ]; then
  LOG_FILE="/dev/null"
else
  if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="/dev/null"
  else
    rm -f "$LOG_FILE" 2>/dev/null || true
  fi
fi
sh -c "${VERCEL_CMD} dev -l ${LISTEN_ADDR}" > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID (logs: $LOG_FILE)"

# Wait for server to be ready by probing health endpoint
echo "3. Waiting for server to start..."
MAX_WAIT=45
COUNTER=0
READY=0

while [ $COUNTER -lt $MAX_WAIT ]; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/llm/health" || true)
  if [ "$HTTP" = "200" ]; then
    READY=1
    break
  fi
  sleep 1
  COUNTER=$((COUNTER + 1))
  echo -n "."
done
echo ""

if [ "$READY" -ne 1 ]; then
  echo -e "${RED}✗ Vercel dev not ready in ${MAX_WAIT}s${NC}"
  echo "   Legacy local fallback has been removed. Please ensure 'vercel dev' works locally."
  echo "   Tip: install Vercel CLI (npm i -g vercel) or run 'npx vercel dev'."
  exit 1
fi

echo -e "   ${GREEN}✓${NC} Server ready on port ${PORT}"

# Check for common startup errors in log
if grep -q "Error: Must use import to load ES Module" "$LOG_FILE" 2>/dev/null; then
  echo -e "${RED}✗ ES Module error detected${NC}"
  grep "Error: Must use import" "$LOG_FILE" | head -3
  exit 1
fi

if grep -q "Error:.*is not defined" "$LOG_FILE" 2>/dev/null; then
  echo -e "${RED}✗ Runtime error detected${NC}"
  grep "Error:.*is not defined" "$LOG_FILE" | head -3
  exit 1
fi

# Test the API endpoint
echo "4. Testing POST /api/llm/generate/scenario..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:$PORT/api/llm/generate/scenario" \
    -H "Content-Type: application/json" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ API call successful!${NC}"
    echo ""
    echo "Response preview:"
    echo "$BODY" | head -20
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}SUCCESS! Backend API is working!${NC}"
    echo -e "${GREEN}========================================${NC}"
elif [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "502" ]; then
    echo -e "${RED}✗ Server error (${HTTP_CODE})${NC}"
    echo "Response: $BODY"
    echo ""
    echo "Last 50 lines of server log:"
    tail -50 "$LOG_FILE" || true
    exit 1
else
    echo -e "${YELLOW}⚠ Unexpected status code${NC}"
    echo "Response: $BODY"
    exit 1
fi

# Cleanup
echo ""
echo "5. Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
echo "   Done"

exit 0
