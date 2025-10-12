#!/bin/bash

echo "Creating 30 shifts for comprehensive testing..."

success_count=0
fail_count=0

for i in {1..30}; do
  day=$((1 + i))  # Start from day 2 to avoid conflicts
  echo "Creating shift $i for 2025-10-$day..."
  
  # Create the JSON with proper T separator
  json_data="{\"shift\": {\"client_name\": \"Bulk Test Hotel $i\", \"role_needed\": \"Server\", \"start_time_utc\": \"2025-10-$day\"T\"14:00:00Z\", \"end_time_utc\": \"2025-10-$day\"T\"22:00:00Z\", \"capacity\": 2, \"location\": \"Bulk Test St $i\", \"pay_rate\": 25.0, \"status\": \"published\"}}"
  
  response=$(curl -X POST -b cookies.txt "http://localhost:3000/api/v1/shifts" \
    -H "Content-Type: application/json" \
    -d "$json_data" \
    -s)
  
  if echo "$response" | jq -e '.status == "success"' > /dev/null 2>&1; then
    echo "✅ Shift $i created successfully"
    ((success_count++))
  else
    echo "❌ Shift $i failed: $(echo "$response" | jq -r '.errors // .error' 2>/dev/null || echo 'Unknown error')"
    ((fail_count++))
  fi
  
  sleep 0.1
done

echo ""
echo "Bulk creation complete!"
echo "✅ Successfully created: $success_count shifts"
echo "❌ Failed: $fail_count shifts"
