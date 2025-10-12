#!/bin/bash
BASE_URL="http://localhost:3000/api/v1"

echo "=== Testing Workers API ==="
echo "List workers:"
curl -s "$BASE_URL/workers" | jq

echo -e "\n=== Testing Shifts API ==="
echo "List shifts:"
curl -s "$BASE_URL/shifts" | jq

echo -e "\n=== Testing Certifications API ==="
echo "List certifications:"
curl -s "$BASE_URL/certifications" | jq

echo -e "\n=== Testing Assignment (should work) ==="
curl -X POST -H "Content-Type: application/json" \
  -d '{"shift_id":1,"worker_id":1}' \
  -s "$BASE_URL/assignments" | jq

echo -e "\n=== Testing Conflict Detection ==="
echo "Try to assign same worker again (should fail):"
curl -X POST -H "Content-Type: application/json" \
  -d '{"shift_id":1,"worker_id":1}' \
  -s "$BASE_URL/assignments" | jq
