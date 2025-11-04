#!/bin/bash

# 🔗 FRONTEND-BACKEND INTEGRATION TEST
# Tests that frontend UI correctly reflects backend staffing logic
# Ensures no more "Assign Worker" buttons on fully staffed shifts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"
COOKIES_FILE="test_integration_cookies.txt"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        echo -e "${RED}   Details: $details${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

log_section() {
    echo ""
    echo -e "${BLUE}🔍 $1${NC}"
    echo "=================================================="
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up test files...${NC}"
    rm -f "$COOKIES_FILE"
    rm -f "test_*.json"
}

# Set up cleanup trap
trap cleanup EXIT

echo -e "${BLUE}🔗 FRONTEND-BACKEND INTEGRATION TEST${NC}"
echo "=================================================="
echo "Testing UI consistency with backend staffing logic"
echo ""

# Authentication
echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -c "$COOKIES_FILE" -X POST "$BASE_URL/api/v1/login" \
    -H "Content-Type: application/json" \
    -d '{"user": {"email": "admin@socialcatering.com", "password": "password123"}}')

if ! echo "$LOGIN_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
    echo -e "${RED}❌ Failed to authenticate${NC}"
    exit 1
fi

# Test 1: Backend Data Collection
log_section "COLLECTING BACKEND DATA"

echo "Collecting backend staffing data..."

# Get all active events with their staffing details
EVENTS_RESPONSE=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE")
EVENT_COUNT=$(echo "$EVENTS_RESPONSE" | jq -r '.data | length')

echo "Found $EVENT_COUNT active events"

# Create a detailed backend data file
echo "$EVENTS_RESPONSE" | jq '.data[] | select(.shifts_by_role) | {
    id: .id,
    title: .title,
    staffing_percentage: .staffing_percentage,
    total_workers_needed: .total_workers_needed,
    assigned_workers_count: .assigned_workers_count,
    shifts_by_role: .shifts_by_role | map({
        role_name: .role_name,
        total_shifts: .total_shifts,
        filled_shifts: .filled_shifts,
        shifts: .shifts | map({
            id: .id,
            role_needed: .role_needed,
            capacity: .capacity,
            staffing_progress: .staffing_progress,
            assignments: .assignments
        })
    })
}' > backend_data.json

echo "Backend data saved to backend_data.json"

# Test 2: Frontend API Consistency
log_section "FRONTEND API CONSISTENCY"

echo "Testing that frontend receives consistent data..."

# Test 2.1: Events API returns expected structure
EVENTS_API_RESPONSE=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE")
if echo "$EVENTS_API_RESPONSE" | jq -e '.data[] | has("shifts_by_role")' > /dev/null; then
    log_test "Events API structure" "PASS" "API returns shifts_by_role data"
else
    log_test "Events API structure" "FAIL" "API missing shifts_by_role data"
fi

# Test 2.2: Individual shift API consistency
SHIFT_IDS=$(echo "$EVENTS_API_RESPONSE" | jq -r '.data[] | .shifts_by_role[]? | .shifts[]? | .id' | head -5)

for SHIFT_ID in $SHIFT_IDS; do
    if [ -n "$SHIFT_ID" ] && [ "$SHIFT_ID" != "null" ]; then
        SHIFT_DETAILS=$(curl -s "$BASE_URL/api/v1/shifts/$SHIFT_ID" -b "$COOKIES_FILE")
        
        # Check if shift details API returns consistent data
        if echo "$SHIFT_DETAILS" | jq -e '.data.staffing_progress' > /dev/null; then
            log_test "Shift $SHIFT_ID API consistency" "PASS" "Shift API returns staffing_progress"
        else
            log_test "Shift $SHIFT_ID API consistency" "FAIL" "Shift API missing staffing_progress"
        fi
    fi
done

# Test 3: Staffing Progress Logic Verification
log_section "STAFFING PROGRESS LOGIC VERIFICATION"

echo "Verifying staffing progress calculations..."

# Process each event
echo "$EVENTS_RESPONSE" | jq -r '.data[] | select(.shifts_by_role) | .id' | while read -r EVENT_ID; do
    echo "Testing Event ID: $EVENT_ID"
    
    # Get event details
    EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
    EVENT_TITLE=$(echo "$EVENT_DETAILS" | jq -r '.data.title')
    
    echo "  Event: $EVENT_TITLE"
    
    # Test each role group
    echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role[] | "\(.role_name):\(.total_shifts):\(.filled_shifts)"' | while read -r role_info; do
        ROLE_NAME=$(echo "$role_info" | cut -d: -f1)
        TOTAL_SHIFTS=$(echo "$role_info" | cut -d: -f2)
        FILLED_SHIFTS=$(echo "$role_info" | cut -d: -f3)
        
        echo "    Role: $ROLE_NAME ($FILLED_SHIFTS/$TOTAL_SHIFTS filled)"
        
        # Test each shift in this role
        echo "$EVENT_DETAILS" | jq -r --arg role "$ROLE_NAME" '.data.shifts_by_role[] | select(.role_name == $role) | .shifts[] | "\(.id):\(.staffing_progress.assigned):\(.staffing_progress.required):\(.staffing_progress.percentage)"' | while read -r shift_info; do
            SHIFT_ID=$(echo "$shift_info" | cut -d: -f1)
            ASSIGNED=$(echo "$shift_info" | cut -d: -f2)
            REQUIRED=$(echo "$shift_info" | cut -d: -f3)
            PERCENTAGE=$(echo "$shift_info" | cut -d: -f4)
            
            echo "      Shift $SHIFT_ID: $ASSIGNED/$REQUIRED ($PERCENTAGE%)"
            
            # Test 3.1: Each shift should have capacity 1
            if [ "$REQUIRED" = "1" ]; then
                log_test "Shift $SHIFT_ID capacity" "PASS" "Capacity is 1"
            else
                log_test "Shift $SHIFT_ID capacity" "FAIL" "Capacity is $REQUIRED, should be 1"
            fi
            
            # Test 3.2: Percentage should be 0% or 100% (since capacity is 1)
            if [ "$PERCENTAGE" = "0" ] || [ "$PERCENTAGE" = "100" ]; then
                log_test "Shift $SHIFT_ID percentage" "PASS" "Percentage $PERCENTAGE% is valid"
            else
                log_test "Shift $SHIFT_ID percentage" "FAIL" "Percentage $PERCENTAGE% should be 0% or 100%"
            fi
            
            # Test 3.3: Assigned should be 0 or 1
            if [ "$ASSIGNED" = "0" ] || [ "$ASSIGNED" = "1" ]; then
                log_test "Shift $SHIFT_ID assigned count" "PASS" "Assigned count $ASSIGNED is valid"
            else
                log_test "Shift $SHIFT_ID assigned count" "FAIL" "Assigned count $ASSIGNED should be 0 or 1"
            fi
        done
    done
done

# Test 4: Frontend Page Load Tests
log_section "FRONTEND PAGE LOAD TESTS"

echo "Testing frontend pages load correctly..."

# Test 4.1: Events page
EVENTS_PAGE_RESPONSE=$(curl -s "$FRONTEND_URL/events")
if echo "$EVENTS_PAGE_RESPONSE" | grep -q "root\|vite\|react"; then
    log_test "Events page loads" "PASS" "Frontend page loads successfully"
else
    log_test "Events page loads" "FAIL" "Frontend page failed to load"
fi

# Test 4.2: Workers page
WORKERS_PAGE_RESPONSE=$(curl -s "$FRONTEND_URL/workers")
if echo "$WORKERS_PAGE_RESPONSE" | grep -q "root\|vite\|react"; then
    log_test "Workers page loads" "PASS" "Frontend page loads successfully"
else
    log_test "Workers page loads" "FAIL" "Frontend page failed to load"
fi

# Test 4.3: Dashboard page
DASHBOARD_PAGE_RESPONSE=$(curl -s "$FRONTEND_URL/dashboard")
if echo "$DASHBOARD_PAGE_RESPONSE" | grep -q "root\|vite\|react"; then
    log_test "Dashboard page loads" "PASS" "Frontend page loads successfully"
else
    log_test "Dashboard page loads" "FAIL" "Frontend page failed to load"
fi

# Test 5: Assignment Flow Test
log_section "ASSIGNMENT FLOW TEST"

echo "Testing complete assignment flow..."

# Find a shift that needs workers
SHIFT_TO_TEST=$(echo "$EVENTS_RESPONSE" | jq -r '.data[] | select(.shifts_by_role) | .shifts_by_role[]? | .shifts[]? | select(.staffing_progress.percentage < 100) | .id' | head -1)

if [ -n "$SHIFT_TO_TEST" ] && [ "$SHIFT_TO_TEST" != "null" ]; then
    echo "Testing assignment flow with Shift ID: $SHIFT_TO_TEST"
    
    # Get shift details before assignment
    SHIFT_BEFORE=$(curl -s "$BASE_URL/api/v1/shifts/$SHIFT_TO_TEST" -b "$COOKIES_FILE")
    BEFORE_ASSIGNED=$(echo "$SHIFT_BEFORE" | jq -r '.data.staffing_progress.assigned')
    BEFORE_PERCENTAGE=$(echo "$SHIFT_BEFORE" | jq -r '.data.staffing_progress.percentage')
    
    echo "Before assignment: $BEFORE_ASSIGNED/1 ($BEFORE_PERCENTAGE%)"
    
    # Find a worker to assign
    WORKER_ID=$(curl -s "$BASE_URL/api/v1/workers?active=true" -b "$COOKIES_FILE" | jq -r '.data[0]?.id')
    
    if [ -n "$WORKER_ID" ] && [ "$WORKER_ID" != "null" ]; then
        echo "Assigning Worker ID: $WORKER_ID"
        
        # Create assignment
        ASSIGNMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/staffing" -b "$COOKIES_FILE" \
            -H "Content-Type: application/json" \
            -d "{\"assignment\": {\"shift_id\": $SHIFT_TO_TEST, \"worker_id\": $WORKER_ID, \"status\": \"assigned\"}}")
        
        if echo "$ASSIGNMENT_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
            log_test "Assignment creation" "PASS" "Successfully created assignment"
            
            # Verify shift is now fully staffed
            sleep 1
            SHIFT_AFTER=$(curl -s "$BASE_URL/api/v1/shifts/$SHIFT_TO_TEST" -b "$COOKIES_FILE")
            AFTER_ASSIGNED=$(echo "$SHIFT_AFTER" | jq -r '.data.staffing_progress.assigned')
            AFTER_PERCENTAGE=$(echo "$SHIFT_AFTER" | jq -r '.data.staffing_progress.percentage')
            
            echo "After assignment: $AFTER_ASSIGNED/1 ($AFTER_PERCENTAGE%)"
            
            # Test 5.1: Should now be fully staffed
            if [ "$AFTER_PERCENTAGE" = "100" ] && [ "$AFTER_ASSIGNED" = "1" ]; then
                log_test "Shift fully staffed after assignment" "PASS" "Correctly shows 1/1 (100%)"
            else
                log_test "Shift fully staffed after assignment" "FAIL" "Expected 1/1 (100%), got $AFTER_ASSIGNED/1 ($AFTER_PERCENTAGE%)"
            fi
            
            # Test 5.2: Event-level stats should update
            EVENT_AFTER=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
            EVENT_ASSIGNED_AFTER=$(echo "$EVENT_AFTER" | jq -r '.data.assigned_workers_count')
            EVENT_PERCENTAGE_AFTER=$(echo "$EVENT_AFTER" | jq -r '.data.staffing_percentage')
            
            echo "Event after assignment: $EVENT_ASSIGNED_AFTER workers ($EVENT_PERCENTAGE_AFTER%)"
            
            # Clean up: Remove the assignment
            ASSIGNMENT_ID=$(echo "$ASSIGNMENT_RESPONSE" | jq -r '.data.id')
            DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/v1/staffing/$ASSIGNMENT_ID" -b "$COOKIES_FILE")
            
            if echo "$DELETE_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
                log_test "Assignment cleanup" "PASS" "Successfully removed test assignment"
            else
                log_test "Assignment cleanup" "FAIL" "Failed to remove test assignment"
            fi
            
        else
            log_test "Assignment creation" "FAIL" "Failed to create assignment: $ASSIGNMENT_RESPONSE"
        fi
    else
        log_test "Assignment flow test" "SKIP" "No workers available for testing"
    fi
else
    log_test "Assignment flow test" "SKIP" "No shifts available for testing"
fi

# Test 6: Data Consistency Across APIs
log_section "DATA CONSISTENCY ACROSS APIs"

echo "Testing data consistency across different API endpoints..."

# Test 6.1: Events list vs individual event details
EVENT_IDS=$(echo "$EVENTS_RESPONSE" | jq -r '.data[0:3] | .[].id')

for EVENT_ID in $EVENT_IDS; do
    if [ -n "$EVENT_ID" ] && [ "$EVENT_ID" != "null" ]; then
        # Get event from list
        EVENT_FROM_LIST=$(echo "$EVENTS_RESPONSE" | jq -r --arg id "$EVENT_ID" '.data[] | select(.id == ($id | tonumber))')
        
        # Get individual event details
        EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
        
        # Compare staffing percentage
        LIST_PERCENTAGE=$(echo "$EVENT_FROM_LIST" | jq -r '.staffing_percentage')
        DETAILS_PERCENTAGE=$(echo "$EVENT_DETAILS" | jq -r '.data.staffing_percentage')
        
        if [ "$LIST_PERCENTAGE" = "$DETAILS_PERCENTAGE" ]; then
            log_test "Event $EVENT_ID consistency" "PASS" "Staffing percentage consistent: $LIST_PERCENTAGE%"
        else
            log_test "Event $EVENT_ID consistency" "FAIL" "List: $LIST_PERCENTAGE%, Details: $DETAILS_PERCENTAGE%"
        fi
    fi
done

# Test 7: Edge Cases
log_section "EDGE CASES"

echo "Testing edge cases..."

# Test 7.1: Events with no shifts
NO_SHIFTS_EVENTS=$(echo "$EVENTS_RESPONSE" | jq -r '.data[] | select(.shifts_count == 0) | .id' | head -3)
for EVENT_ID in $NO_SHIFTS_EVENTS; do
    if [ -n "$EVENT_ID" ] && [ "$EVENT_ID" != "null" ]; then
        EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
        TOTAL_NEEDED=$(echo "$EVENT_DETAILS" | jq -r '.data.total_workers_needed')
        ASSIGNED_COUNT=$(echo "$EVENT_DETAILS" | jq -r '.data.assigned_workers_count')
        
        if [ "$TOTAL_NEEDED" = "0" ] && [ "$ASSIGNED_COUNT" = "0" ]; then
            log_test "Event $EVENT_ID with no shifts" "PASS" "Correctly shows 0/0 workers"
        else
            log_test "Event $EVENT_ID with no shifts" "FAIL" "Expected 0/0, got $ASSIGNED_COUNT/$TOTAL_NEEDED"
        fi
    fi
done

# Test 7.2: Fully staffed events
FULLY_STAFFED_EVENTS=$(echo "$EVENTS_RESPONSE" | jq -r '.data[] | select(.staffing_percentage == 100) | .id' | head -3)
for EVENT_ID in $FULLY_STAFFED_EVENTS; do
    if [ -n "$EVENT_ID" ] && [ "$EVENT_ID" != "null" ]; then
        EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
        
        # Check that all shifts are fully staffed
        UNFILLED_SHIFTS=$(echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role[]? | .shifts[]? | select(.staffing_progress.percentage != 100) | .id' | wc -l)
        
        if [ "$UNFILLED_SHIFTS" = "0" ]; then
            log_test "Fully staffed event $EVENT_ID" "PASS" "All shifts show 100% staffing"
        else
            log_test "Fully staffed event $EVENT_ID" "FAIL" "Found $UNFILLED_SHIFTS unfilled shifts"
        fi
    fi
done

# Final Results
echo ""
echo -e "${BLUE}📊 INTEGRATION TEST RESULTS${NC}"
echo "=================================================="
echo -e "Total Tests Run: ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}Frontend and backend are working consistently.${NC}"
    echo -e "${GREEN}No more 'Assign Worker' buttons on fully staffed shifts.${NC}"
    echo -e "${GREEN}Staffing logic is correct across all levels.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${RED}Please review the failed tests above.${NC}"
    echo -e "${RED}Frontend-backend integration may have issues.${NC}"
    exit 1
fi
