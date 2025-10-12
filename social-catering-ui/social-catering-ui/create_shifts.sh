#!/bin/bash
for i in {1..5}; do
  day=$((17 + i))
  echo "Creating shift $i for 2025-10-$day..."
  
  curl -X POST -b cookies.txt "http://localhost:3000/api/v1/shifts" \
    -H "Content-Type: application/json" \
    -d "{\"shift\": {\"client_name\": \"Bulk Test Hotel $i\", \"role_needed\": \"Server\", \"start_time_utc\": \"2025-10-$day:14:00:00Z\", \"end_time_utc\": \"2025-10-$day:22:00:00Z\", \"capacity\": 2, \"location\": \"Bulk Test St $i\", \"pay_rate\": 25.0, \"status\": \"published\"}}" \
    -s | jq -r '.status'
  
  sleep 0.1
done
