#!/bin/bash

echo "Creating 10 shifts for performance testing (FIXED FORMAT)..."

for i in {1..10}; do
  day=$((21 + i))
  echo "Creating shift $i for 2025-10-$day..."
  
  response=$(curl -X POST -b cookies.txt "http://localhost:3000/api/v1/shifts" \
    -H "Content-Type: application/json" \
    -d "{\"shift\": {\"client_name\": \"Performance Test Hotel $i\", \"role_needed\": \"Server\", \"start_time_utc\": \"2025-10-$day\"T\"14:00:00Z\", \"end_time_utc\": \"2025-10-$day\"T\"22:00:00Z\", \"capacity\": 2, \"location\": \"Performance Test St $i\", \"pay_rate\": 25.0, \"status\": \"published\"}}" \
    -s)
  
  if echo "$response" | jq -e '.status == "success"' > /dev/null; then
    echo "✅ Shift $i created successfully"
  else
    echo "❌ Shift $i failed: $(echo "$response" | jq -r '.errors // .error')"
  fi
  
  sleep 0.1
done

echo "Bulk creation complete!"
