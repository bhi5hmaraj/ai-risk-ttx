#!/bin/bash

# Test the feedback API locally or in production

set -e

echo "🧪 Testing Feedback API"
echo "======================="
echo ""

# Determine API URL
if [ -z "$1" ]; then
    API_URL="http://localhost:3000"
    echo "Testing LOCAL API: $API_URL"
    echo "(Pass a URL as first argument to test production)"
else
    API_URL="$1"
    echo "Testing PRODUCTION API: $API_URL"
fi

echo ""

# Check if test payload exists
TEST_PAYLOAD="api/test-feedback.json"
if [ ! -f "$TEST_PAYLOAD" ]; then
    echo "❌ Test payload not found: $TEST_PAYLOAD"
    exit 1
fi

echo "Sending test feedback..."
echo ""

# Send request
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${API_URL}/api/feedback" \
  -H "Content-Type: application/json" \
  -d @"$TEST_PAYLOAD")

# Extract HTTP code
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "Response:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""

# Check response
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Success! Feedback submitted successfully"
    exit 0
elif [ "$HTTP_CODE" = "400" ]; then
    echo "❌ Bad Request - Check payload format"
    exit 1
elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ Server Error - Check DATABASE_URL and server logs"
    exit 1
else
    echo "⚠️  Unexpected status code: $HTTP_CODE"
    exit 1
fi
