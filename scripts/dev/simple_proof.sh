#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://sc-mvp-staging-c6ef090c6c41.herokuapp.com"
EMAIL="natalie@socialcatering.com"
PASSWORD="password123"

COOKIE_JAR=$(mktemp)

echo "=== Simple M1 Proof Test ==="
echo "Base URL: $BASE_URL"
echo ""

# Login
echo "Logging in..."
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H "Content-Type: application/json" -X POST --data "{\"user\":{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}}" "$BASE_URL/api/v1/login" > /dev/null
echo "✅ Login completed"

# Test health
echo "Testing health endpoint..."
health=$(curl -s "$BASE_URL/healthz")
echo "$health" | grep -q '"status"' && echo "✅ Health check passed" || echo "❌ Health check failed"
echo ""

# Test workers CRUD
echo "Testing workers CRUD..."
TS=$(date +%s)

# Create worker
echo "Creating worker..."
worker_response=$(curl -s -b "$COOKIE_JAR" -H "Content-Type: application/json" -X POST --data "{\"worker\":{\"first_name\":\"Test\",\"last_name\":\"Worker-$TS\",\"email\":\"test-$TS@example.com\",\"hourly_rate\":18.5,\"active\":true,\"skills_json\":[\"Server\"]}}" "$BASE_URL/api/v1/workers")
echo "Worker creation response: $worker_response"

# Extract worker ID
worker_id=$(echo "$worker_response" | grep -oE '"id":[0-9]+' | head -n1 | sed -E 's/[^0-9]//g')
echo "Worker ID: $worker_id"

if [[ -n "$worker_id" ]]; then
    echo "✅ Worker created successfully"
    
    # Update worker
    echo "Updating worker..."
    update_response=$(curl -s -b "$COOKIE_JAR" -H "Content-Type: application/json" -X PATCH --data '{"worker":{"hourly_rate":19}}' "$BASE_URL/api/v1/workers/$worker_id")
    echo "Update response: $update_response"
    
    # Delete worker
    echo "Deleting worker..."
    delete_response=$(curl -s -b "$COOKIE_JAR" -X DELETE "$BASE_URL/api/v1/workers/$worker_id")
    echo "Delete response: $delete_response"
    echo "✅ CRUD operations completed"
else
    echo "❌ Failed to create worker"
fi

echo ""
echo "=== Test Complete ==="
