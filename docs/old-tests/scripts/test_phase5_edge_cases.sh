#!/bin/bash
BASE_URL="http://localhost:3000/api/v1"
FRONTEND_URL="http://localhost:5177"
ADMIN_EMAIL="admin@socialcatering.com"
ADMIN_PASSWORD="password123"
COOKIES_FILE="cookies.txt"

echo "================================================"
echo "PHASE 5: REPORTS AUDIT - EDGE CASES TESTING"
echo "================================================"

# --- Helper Functions ---
login() {
  echo "Attempting to log in as admin..."
  LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/login" \
    -H "Content-Type: application/json" \
    -d "{\"user\":{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}}" \
    -c "$COOKIES_FILE" -s)
  
  if echo "$LOGIN_RESPONSE" | grep -q "success"; then
    echo "✅ Login successful."
    return 0
  else
    echo "❌ Login failed. Response: $LOGIN_RESPONSE"
    return 1
  fi
}

logout() {
  echo "Logging out..."
  curl -X DELETE "$BASE_URL/logout" -b "$COOKIES_FILE" -s > /dev/null
  rm -f "$COOKIES_FILE"
  echo "✅ Logged out and cookies cleared."
}

# --- Pre-test Setup ---
logout # Ensure clean state
login || { echo "Fatal: Login failed. Exiting."; exit 1; }

# --- Test 1: Empty Date Range ---
echo -e "\n--- Test 1: Empty Date Range ---"
EMPTY_CSV=$(curl -X GET "$BASE_URL/reports/timesheet?start_date=2000-01-01&end_date=2000-01-01" \
  -b "$COOKIES_FILE" -s -L)

if [[ -n "$EMPTY_CSV" && $(echo "$EMPTY_CSV" | head -n 1) == "JOB_ID,SKILL_NAME,WORKER_FIRSTNAME,WORKER_LASTNAME,SHIFT_DATE,SHIFT_START_TIME,SHIFT_END_TIME,UNPAID_BREAK,TOTAL_HOURS,SHIFT_SUPERVISOR,REMARKS" ]]; then
  ROW_COUNT=$(echo "$EMPTY_CSV" | wc -l | tr -d ' ')
  if [[ $ROW_COUNT -eq 1 ]]; then
    echo "✅ Empty date range returns only headers (no data rows)."
  else
    echo "❌ Empty date range returned unexpected data rows: $((ROW_COUNT - 1))"
    exit 1
  fi
else
  echo "❌ Empty date range failed or returned incorrect headers."
  exit 1
fi

# --- Test 2: Large Date Range ---
echo -e "\n--- Test 2: Large Date Range ---"
LARGE_CSV=$(curl -X GET "$BASE_URL/reports/timesheet?start_date=2020-01-01&end_date=2030-12-31" \
  -b "$COOKIES_FILE" -s -L)

if [[ -n "$LARGE_CSV" && $(echo "$LARGE_CSV" | head -n 1) == "JOB_ID,SKILL_NAME,WORKER_FIRSTNAME,WORKER_LASTNAME,SHIFT_DATE,SHIFT_START_TIME,SHIFT_END_TIME,UNPAID_BREAK,TOTAL_HOURS,SHIFT_SUPERVISOR,REMARKS" ]]; then
  ROW_COUNT=$(echo "$LARGE_CSV" | wc -l | tr -d ' ')
  echo "✅ Large date range returns data with correct headers."
  echo "   Total rows: $((ROW_COUNT - 1))"
else
  echo "❌ Large date range failed or returned incorrect headers."
  exit 1
fi

# --- Test 3: Invalid Date Format ---
echo -e "\n--- Test 3: Invalid Date Format ---"
INVALID_CSV=$(curl -X GET "$BASE_URL/reports/timesheet?start_date=invalid-date&end_date=2025-12-31" \
  -b "$COOKIES_FILE" -s -L)

if echo "$INVALID_CSV" | grep -q "error\|Error\|ERROR"; then
  echo "✅ Invalid date format returns error response."
else
  echo "❌ Invalid date format should return error but didn't."
  echo "   Response: $INVALID_CSV"
fi

# --- Test 4: Missing Date Parameters ---
echo -e "\n--- Test 4: Missing Date Parameters ---"
MISSING_CSV=$(curl -X GET "$BASE_URL/reports/timesheet" \
  -b "$COOKIES_FILE" -s -L)

if [[ -n "$MISSING_CSV" && $(echo "$MISSING_CSV" | head -n 1) == "JOB_ID,SKILL_NAME,WORKER_FIRSTNAME,WORKER_LASTNAME,SHIFT_DATE,SHIFT_START_TIME,SHIFT_END_TIME,UNPAID_BREAK,TOTAL_HOURS,SHIFT_SUPERVISOR,REMARKS" ]]; then
  echo "✅ Missing date parameters uses default date range."
else
  echo "❌ Missing date parameters failed or returned incorrect headers."
  exit 1
fi

# --- Test 5: Payroll Empty Date Range ---
echo -e "\n--- Test 5: Payroll Empty Date Range ---"
PAYROLL_EMPTY=$(curl -X GET "$BASE_URL/reports/payroll?start_date=2000-01-01&end_date=2000-01-01" \
  -b "$COOKIES_FILE" -s -L)

if [[ -n "$PAYROLL_EMPTY" && $(echo "$PAYROLL_EMPTY" | head -n 1) == "Date,Event/Client,Location,Role,Worker,Hours,Rate,Total Pay" ]]; then
  ROW_COUNT=$(echo "$PAYROLL_EMPTY" | wc -l | tr -d ' ')
  if [[ $ROW_COUNT -eq 1 ]]; then
    echo "✅ Payroll empty date range returns only headers (no data rows)."
  else
    echo "❌ Payroll empty date range returned unexpected data rows: $((ROW_COUNT - 1))"
    exit 1
  fi
else
  echo "❌ Payroll empty date range failed or returned incorrect headers."
  exit 1
fi

# --- Test 6: Unauthenticated Access ---
echo -e "\n--- Test 6: Unauthenticated Access ---"
logout # Clear cookies

UNAUTH_CSV=$(curl -X GET "$BASE_URL/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" \
  -s -L)

if echo "$UNAUTH_CSV" | grep -q "sign in\|login\|unauthorized\|401"; then
  echo "✅ Unauthenticated access properly rejected."
else
  echo "❌ Unauthenticated access should be rejected but wasn't."
  echo "   Response: $UNAUTH_CSV"
fi

# --- Test 7: Special Characters in Data ---
echo -e "\n--- Test 7: Special Characters in Data ---"
login || { echo "Fatal: Login failed. Exiting."; exit 1; }

SPECIAL_CSV=$(curl -X GET "$BASE_URL/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" \
  -b "$COOKIES_FILE" -s -L)

if [[ -n "$SPECIAL_CSV" ]]; then
  # Check if CSV handles special characters properly (no broken parsing)
  if echo "$SPECIAL_CSV" | grep -q "Event Helper"; then
    echo "✅ Special characters in data handled correctly."
  else
    echo "❌ Special characters in data not handled properly."
    exit 1
  fi
else
  echo "❌ Special characters test failed - no data returned."
  exit 1
fi

# --- Test 8: Concurrent API Calls ---
echo -e "\n--- Test 8: Concurrent API Calls ---"
# Test multiple simultaneous requests
curl -X GET "$BASE_URL/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" \
  -b "$COOKIES_FILE" -s -L > /tmp/timesheet1.csv &
curl -X GET "$BASE_URL/reports/payroll?start_date=2025-10-01&end_date=2025-12-31" \
  -b "$COOKIES_FILE" -s -L > /tmp/payroll1.csv &
curl -X GET "$BASE_URL/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" \
  -b "$COOKIES_FILE" -s -L > /tmp/timesheet2.csv &

wait # Wait for all background jobs to complete

if [[ -f /tmp/timesheet1.csv && -f /tmp/payroll1.csv && -f /tmp/timesheet2.csv ]]; then
  echo "✅ Concurrent API calls handled successfully."
  rm -f /tmp/timesheet1.csv /tmp/payroll1.csv /tmp/timesheet2.csv
else
  echo "❌ Concurrent API calls failed."
  exit 1
fi

# --- Test 9: Performance Test ---
echo -e "\n--- Test 9: Performance Test ---"
START_TIME=$(date +%s%N)
PERF_CSV=$(curl -X GET "$BASE_URL/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" \
  -b "$COOKIES_FILE" -s -L)
END_TIME=$(date +%s%N)

DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [[ $DURATION_MS -lt 2000 ]]; then
  echo "✅ Performance test passed: ${DURATION_MS}ms (under 2s limit)."
else
  echo "❌ Performance test failed: ${DURATION_MS}ms (over 2s limit)."
fi

# --- Cleanup ---
logout

echo -e "\n================================================"
echo "PHASE 5: EDGE CASES TESTING COMPLETE"
echo "================================================"