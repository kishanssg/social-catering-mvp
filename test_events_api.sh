#!/bin/bash
BASE_URL="http://localhost:3000/api/v1"

echo "================================"
echo "EVENTS API TESTING"
echo "================================"

# Login first
echo ""
echo "1. Login..."
LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"user":{"email":"admin@socialcatering.com","password":"password123"}}' \
  -c cookies.txt -s)

echo "Login response: $LOGIN_RESPONSE"

# Test GET /events?tab=draft
echo ""
echo "2. Testing Draft Events..."
DRAFT_RESPONSE=$(curl "$BASE_URL/events?tab=draft" -b cookies.txt -s)
echo "Draft response: $DRAFT_RESPONSE"
DRAFT_COUNT=$(echo "$DRAFT_RESPONSE" | jq '.data | length' 2>/dev/null || echo "Error parsing")
echo "Draft events: $DRAFT_COUNT"

# Test GET /events?tab=active
echo ""
echo "3. Testing Active Events..."
ACTIVE_RESPONSE=$(curl "$BASE_URL/events?tab=active" -b cookies.txt -s)
echo "Active response: $ACTIVE_RESPONSE"
ACTIVE_COUNT=$(echo "$ACTIVE_RESPONSE" | jq '.data | length' 2>/dev/null || echo "Error parsing")
echo "Active events: $ACTIVE_COUNT"

# Test GET /events?tab=past
echo ""
echo "4. Testing Past Events..."
PAST_RESPONSE=$(curl "$BASE_URL/events?tab=past" -b cookies.txt -s)
echo "Past response: $PAST_RESPONSE"
PAST_COUNT=$(echo "$PAST_RESPONSE" | jq '.data | length' 2>/dev/null || echo "Error parsing")
echo "Past events: $PAST_COUNT"

# Test GET /events/:id (get first event)
echo ""
echo "5. Testing Event Details..."
EVENT_ID=$(echo "$DRAFT_RESPONSE" | jq '.data[0].id' 2>/dev/null || echo "null")
if [ "$EVENT_ID" != "null" ] && [ "$EVENT_ID" != "" ]; then
  echo "Testing event ID: $EVENT_ID"
  EVENT_DETAILS=$(curl "$BASE_URL/events/$EVENT_ID" -b cookies.txt -s)
  echo "Event details response: $EVENT_DETAILS"
else
  echo "No draft events found to test details"
fi

# Test filters on active events
echo ""
echo "6. Testing Active Event Filters..."
echo "  Filter: needs_workers"
NEEDS_WORKERS=$(curl "$BASE_URL/events?tab=active&filter=needs_workers" -b cookies.txt -s | jq '.data | length' 2>/dev/null || echo "Error")
echo "  Needs workers count: $NEEDS_WORKERS"

echo "  Filter: fully_staffed"
FULLY_STAFFED=$(curl "$BASE_URL/events?tab=active&filter=fully_staffed" -b cookies.txt -s | jq '.data | length' 2>/dev/null || echo "Error")
echo "  Fully staffed count: $FULLY_STAFFED"

# Test event with shifts data
echo ""
echo "7. Testing Event with Shifts..."
if [ "$EVENT_ID" != "null" ] && [ "$EVENT_ID" != "" ]; then
  SHIFTS_DATA=$(curl "$BASE_URL/events/$EVENT_ID" -b cookies.txt -s | jq '.data.shifts_by_role | length' 2>/dev/null || echo "Error")
  echo "  Shifts by role count: $SHIFTS_DATA"
else
  echo "  No event ID available for shifts test"
fi

# Cleanup
rm -f cookies.txt

echo ""
echo "================================"
echo "API Testing Complete"
echo "================================"
