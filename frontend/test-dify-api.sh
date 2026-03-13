#!/bin/bash

# Test script for Dify API integration

echo "Testing Dify API Integration..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found!"
  echo "Please create .env.local with your Dify API credentials"
  exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check if API key is set
if [ -z "$NEXT_PUBLIC_DIFY_API_KEY" ]; then
  echo "❌ Error: NEXT_PUBLIC_DIFY_API_KEY not set in .env.local"
  exit 1
fi

echo "✅ Environment variables loaded"
echo "📡 Testing API endpoint: http://localhost:3000/api/chat"
echo ""

# Test cases
test_cases=(
  "deposit 1 ETH"
  "withdraw 0.5 USDT"
  "存入 100 USDT"
  "我想提取 10 ETH"
  "put 2.5 ETH into vault"
)

for test_input in "${test_cases[@]}"; do
  echo "Testing: $test_input"

  response=$(curl -s -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$test_input\"}")

  # Extract success status and action
  success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d':' -f2)
  action=$(echo "$response" | grep -o '"action":"[^"]*"' | cut -d'"' -f4)

  if [ "$success" = "true" ]; then
    echo "✅ Success: action=$action"
  else
    echo "❌ Failed"
    echo "Response: $response"
  fi
  echo ""
done

echo "Testing complete!"
