#!/bin/bash
BASE_URL="http://localhost:3000/api/v1"
FRONTEND_URL="http://localhost:5177"
ADMIN_EMAIL="admin@socialcatering.com"
ADMIN_PASSWORD="password123"
COOKIES_FILE="cookies.txt"

echo "================================================"
echo "PHASE 5: REPORTS AUDIT - COMPREHENSIVE TESTING"
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

# --- Test 1: Timesheet Export API (Basic) ---
echo -e "\n--- Test 1: Timesheet Export API (Basic) ---"
START_DATE="2025-10-01"  # October 2025 (when completed assignments exist)
END_DATE="2025-12-31"    # December 2025

TIMESHEET_CSV=$(curl -X GET "$BASE_URL/reports/timesheet?start_date=$START_DATE&end_date=$END_DATE" \
  -b "$COOKIES_FILE" -s -L) # -L to follow redirects

if [[ -n "$TIMESHEET_CSV" && $(echo "$TIMESHEET_CSV" | head -n 1) == "JOB_ID,SKILL_NAME,WORKER_FIRSTNAME,WORKER_LASTNAME,SHIFT_DATE,SHIFT_START_TIME,SHIFT_END_TIME,UNPAID_BREAK,TOTAL_HOURS,SHIFT_SUPERVISOR,REMARKS" ]]; then
  echo "✅ Timesheet CSV API returns data with correct headers."
  echo "   First 3 lines:"
  echo "$TIMESHEET_CSV" | head -n 3
  TIMESHEET_ROW_COUNT=$(echo "$TIMESHEET_CSV" | wc -l | tr -d ' ')
  echo "   Total rows: $((TIMESHEET_ROW_COUNT - 1))" # Subtract header
else
  echo "❌ Timesheet CSV API failed or returned incorrect headers."
  echo "   Response:"
  echo "$TIMESHEET_CSV" | head -n 5
  exit 1
fi

# --- Test 2: Payroll Export API (Basic) ---
echo -e "\n--- Test 2: Payroll Export API (Basic) ---"
PAYROLL_CSV=$(curl -X GET "$BASE_URL/reports/payroll?start_date=$START_DATE&end_date=$END_DATE" \
  -b "$COOKIES_FILE" -s -L)

if [[ -n "$PAYROLL_CSV" && $(echo "$PAYROLL_CSV" | head -n 1) == "Date,Event/Client,Location,Role,Worker,Hours,Rate,Total Pay" ]]; then
  echo "✅ Payroll CSV API returns data with correct headers."
  echo "   First 3 lines:"
  echo "$PAYROLL_CSV" | head -n 3
  PAYROLL_ROW_COUNT=$(echo "$PAYROLL_CSV" | wc -l | tr -d ' ')
  echo "   Total rows: $((PAYROLL_ROW_COUNT - 1))" # Subtract header
else
  echo "❌ Payroll CSV API failed or returned incorrect headers."
  echo "   Response:"
  echo "$PAYROLL_CSV" | head -n 5
  exit 1
fi

# --- Test 3: Timesheet CSV Data Format (Spot Check) ---
echo -e "\n--- Test 3: Timesheet CSV Data Format (Spot Check) ---"
FIRST_DATA_ROW=$(echo "$TIMESHEET_CSV" | sed -n '2p') # Get second line (first data row)

if [[ -n "$FIRST_DATA_ROW" ]]; then
  JOB_ID=$(echo "$FIRST_DATA_ROW" | cut -d',' -f1)
  SHIFT_DATE=$(echo "$FIRST_DATA_ROW" | cut -d',' -f5)
  SHIFT_START_TIME=$(echo "$FIRST_DATA_ROW" | cut -d',' -f6)
  SHIFT_END_TIME=$(echo "$FIRST_DATA_ROW" | cut -d',' -f7)
  UNPAID_BREAK=$(echo "$FIRST_DATA_ROW" | cut -d',' -f8)
  TOTAL_HOURS=$(echo "$FIRST_DATA_ROW" | cut -d',' -f9)

  echo "   Sample Data Row: $FIRST_DATA_ROW"
  echo "   JOB_ID: $JOB_ID"
  echo "   SHIFT_DATE: $SHIFT_DATE (Expected MM/DD/YYYY)"
  echo "   SHIFT_START_TIME: $SHIFT_START_TIME (Expected HH:MM AM/PM)"
  echo "   SHIFT_END_TIME: $SHIFT_END_TIME (Expected HH:MM AM/PM)"
  echo "   UNPAID_BREAK: $UNPAID_BREAK (Expected X.XX)"
  echo "   TOTAL_HOURS: $TOTAL_HOURS (Expected X.XX)"

  # Basic regex checks for format
  DATE_REGEX="^[0-9]{2}/[0-9]{2}/[0-9]{4}$"
  TIME_REGEX="^[0-9]{2}:[0-9]{2} (AM|PM)$"
  DECIMAL_REGEX="^[0-9]+\.[0-9]{2}$"

  if [[ $SHIFT_DATE =~ $DATE_REGEX ]]; then echo "   ✅ Date format correct."; else echo "   ❌ Date format incorrect: $SHIFT_DATE"; exit 1; fi
  if [[ $SHIFT_START_TIME =~ $TIME_REGEX ]]; then echo "   ✅ Start Time format correct."; else echo "   ❌ Start Time format incorrect: $SHIFT_START_TIME"; exit 1; fi
  if [[ $SHIFT_END_TIME =~ $TIME_REGEX ]]; then echo "   ✅ End Time format correct."; else echo "   ❌ End Time format incorrect: $SHIFT_END_TIME"; exit 1; fi
  if [[ $UNPAID_BREAK =~ $DECIMAL_REGEX ]]; then echo "   ✅ Unpaid Break format correct."; else echo "   ❌ Unpaid Break format incorrect: $UNPAID_BREAK"; exit 1; fi
  if [[ $TOTAL_HOURS =~ $DECIMAL_REGEX ]]; then echo "   ✅ Total Hours format correct."; else echo "   ❌ Total Hours format incorrect: $TOTAL_HOURS"; exit 1; fi
else
  echo "❌ No data rows found in Timesheet CSV for format check."
  exit 1
fi

# --- Test 4: Frontend Reports Page Load ---
echo -e "\n--- Test 4: Frontend Reports Page Load ---"
FRONTEND_RESPONSE=$(curl -s -b "$COOKIES_FILE" "$FRONTEND_URL/reports")

if echo "$FRONTEND_RESPONSE" | grep -q "<!doctype html>"; then
  echo "✅ Frontend Reports page loads (HTML detected)."
else
  echo "❌ Frontend Reports page did not load HTML."
  echo "$FRONTEND_RESPONSE" | head -n 10
  exit 1
fi

# --- Test 5: Frontend Quick Export Cards (Presence) ---
echo -e "\n--- Test 5: Frontend Quick Export Cards (Presence) ---"
# React app loads content dynamically, so we check for React app structure
if echo "$FRONTEND_RESPONSE" | grep -q "root" && \
   echo "$FRONTEND_RESPONSE" | grep -q "vite"; then
  echo "✅ Frontend React app structure detected (reports page loads)."
  echo "   Note: Quick export cards load dynamically via React - full testing requires browser automation."
else
  echo "❌ Frontend React app not detected."
  echo "   Response preview: $(echo "$FRONTEND_RESPONSE" | head -n 5)"
fi

# --- Cleanup ---
logout

echo -e "\n================================================"
echo "PHASE 5: COMPREHENSIVE TESTING COMPLETE"
echo "================================================"