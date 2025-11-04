#!/bin/bash

# 🧪 COMPREHENSIVE STAFFING LOGIC TEST SUITE
# Tests all staffing-related calculations and UI consistency
# Ensures no more abstraction level mixing bugs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
COOKIES_FILE="test_cookies.txt"
FRONTEND_URL="http://localhost:5173"

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
    rm -f "test_*.csv"
    rm -f "debug_*.json"
}

# Set up cleanup trap
trap cleanup EXIT

echo -e "${BLUE}🧪 COMPREHENSIVE STAFFING LOGIC TEST SUITE${NC}"
echo "=================================================="
echo "Testing all staffing calculations and UI consistency"
echo ""

# Test 1: Authentication
log_section "AUTHENTICATION SETUP"
echo "Logging in as admin..."

LOGIN_RESPONSE=$(curl -s -c "$COOKIES_FILE" -X POST "$BASE_URL/api/v1/login" \
    -H "Content-Type: application/json" \
    -d '{"user": {"email": "admin@socialcatering.com", "password": "password123"}}')

if echo "$LOGIN_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
    log_test "Admin Login" "PASS" "Successfully authenticated"
else
    log_test "Admin Login" "FAIL" "Failed to authenticate: $LOGIN_RESPONSE"
    exit 1
fi

# Test 2: Backend Staffing Progress Logic
log_section "BACKEND STAFFING PROGRESS LOGIC"

echo "Testing shift staffing progress calculations..."

# Get all events with shifts
EVENTS_RESPONSE=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE")
EVENT_IDS=$(echo "$EVENTS_RESPONSE" | jq -r '.data[] | select(.shifts_count > 0) | .id' | head -3)

for EVENT_ID in $EVENT_IDS; do
    echo "Testing Event ID: $EVENT_ID"
    
    # Get event details
    EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
    
    if echo "$EVENT_DETAILS" | jq -e '.data.shifts_by_role' > /dev/null; then
        # Test each role group
        echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role[] | "\(.role_name): \(.filled_shifts)/\(.total_shifts)"' | while read -r role_info; do
            ROLE_NAME=$(echo "$role_info" | cut -d: -f1 | xargs)
            FILLED=$(echo "$role_info" | cut -d: -f2 | cut -d/ -f1 | xargs)
            TOTAL=$(echo "$role_info" | cut -d: -f2 | cut -d/ -f2 | xargs)
            
            # Test individual shifts within this role
            echo "$EVENT_DETAILS" | jq -r --arg role "$ROLE_NAME" '.data.shifts_by_role[] | select(.role_name == $role) | .shifts[] | "\(.id):\(.staffing_progress.percentage):\(.staffing_progress.assigned):\(.staffing_progress.required)"' | while read -r shift_info; do
                SHIFT_ID=$(echo "$shift_info" | cut -d: -f1)
                PERCENTAGE=$(echo "$shift_info" | cut -d: -f2)
                ASSIGNED=$(echo "$shift_info" | cut -d: -f3)
                REQUIRED=$(echo "$shift_info" | cut -d: -f4)
                
                # Test 2.1: Shift capacity should always be 1
                if [ "$REQUIRED" = "1" ]; then
                    log_test "Shift $SHIFT_ID capacity" "PASS" "Capacity is 1 (correct)"
                else
                    log_test "Shift $SHIFT_ID capacity" "FAIL" "Capacity is $REQUIRED, should be 1"
                fi
                
                # Test 2.2: Percentage calculation should be correct
                EXPECTED_PERCENTAGE=$((ASSIGNED * 100 / REQUIRED))
                if [ "$PERCENTAGE" = "$EXPECTED_PERCENTAGE" ]; then
                    log_test "Shift $SHIFT_ID percentage calculation" "PASS" "Percentage $PERCENTAGE% is correct"
                else
                    log_test "Shift $SHIFT_ID percentage calculation" "FAIL" "Expected $EXPECTED_PERCENTAGE%, got $PERCENTAGE%"
                fi
                
                # Test 2.3: Fully staffed logic
                if [ "$ASSIGNED" = "$REQUIRED" ] && [ "$PERCENTAGE" = "100" ]; then
                    log_test "Shift $SHIFT_ID fully staffed logic" "PASS" "Correctly identified as fully staffed"
                elif [ "$ASSIGNED" -lt "$REQUIRED" ] && [ "$PERCENTAGE" -lt "100" ]; then
                    log_test "Shift $SHIFT_ID fully staffed logic" "PASS" "Correctly identified as not fully staffed"
                else
                    log_test "Shift $SHIFT_ID fully staffed logic" "FAIL" "Inconsistent staffing status"
                fi
            done
        done
    else
        log_test "Event $EVENT_ID shifts_by_role" "FAIL" "No shifts_by_role data found"
    fi
done

# Test 3: Event-Level vs Shift-Level Consistency
log_section "EVENT-LEVEL VS SHIFT-LEVEL CONSISTENCY"

for EVENT_ID in $EVENT_IDS; do
    echo "Testing Event ID: $EVENT_ID consistency..."
    
    EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
    
    # Get event-level stats
    EVENT_TOTAL_NEEDED=$(echo "$EVENT_DETAILS" | jq -r '.data.total_workers_needed')
    EVENT_ASSIGNED=$(echo "$EVENT_DETAILS" | jq -r '.data.assigned_workers_count')
    EVENT_PERCENTAGE=$(echo "$EVENT_DETAILS" | jq -r '.data.staffing_percentage')
    
    # Calculate from shift-level data
    SHIFT_TOTAL_NEEDED=$(echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role | map(.total_shifts) | add // 0')
    SHIFT_ASSIGNED=$(echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role | map(.filled_shifts) | add // 0')
    
    # Test 3.1: Total workers needed should match
    if [ "$EVENT_TOTAL_NEEDED" = "$SHIFT_TOTAL_NEEDED" ]; then
        log_test "Event $EVENT_ID total workers consistency" "PASS" "Event: $EVENT_TOTAL_NEEDED, Shifts: $SHIFT_TOTAL_NEEDED"
    else
        log_test "Event $EVENT_ID total workers consistency" "FAIL" "Event: $EVENT_TOTAL_NEEDED, Shifts: $SHIFT_TOTAL_NEEDED"
    fi
    
    # Test 3.2: Assigned workers should match
    if [ "$EVENT_ASSIGNED" = "$SHIFT_ASSIGNED" ]; then
        log_test "Event $EVENT_ID assigned workers consistency" "PASS" "Event: $EVENT_ASSIGNED, Shifts: $SHIFT_ASSIGNED"
    else
        log_test "Event $EVENT_ID assigned workers consistency" "FAIL" "Event: $EVENT_ASSIGNED, Shifts: $SHIFT_ASSIGNED"
    fi
    
    # Test 3.3: Percentage calculation should be consistent
    if [ "$EVENT_TOTAL_NEEDED" -gt 0 ]; then
        EXPECTED_PERCENTAGE=$((EVENT_ASSIGNED * 100 / EVENT_TOTAL_NEEDED))
        if [ "$EVENT_PERCENTAGE" = "$EXPECTED_PERCENTAGE" ]; then
            log_test "Event $EVENT_ID percentage consistency" "PASS" "Percentage: $EVENT_PERCENTAGE%"
        else
            log_test "Event $EVENT_ID percentage consistency" "FAIL" "Expected: $EXPECTED_PERCENTAGE%, Got: $EVENT_PERCENTAGE%"
        fi
    fi
done

# Test 4: Role Group Calculations
log_section "ROLE GROUP CALCULATIONS"

for EVENT_ID in $EVENT_IDS; do
    echo "Testing Event ID: $EVENT_ID role groups..."
    
    EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
    
    # Test each role group
    echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role[] | "\(.role_name):\(.total_shifts):\(.filled_shifts)"' | while read -r role_info; do
        ROLE_NAME=$(echo "$role_info" | cut -d: -f1)
        TOTAL_SHIFTS=$(echo "$role_info" | cut -d: -f2)
        FILLED_SHIFTS=$(echo "$role_info" | cut -d: -f3)
        
        # Count actual shifts for this role
        ACTUAL_TOTAL=$(echo "$EVENT_DETAILS" | jq -r --arg role "$ROLE_NAME" '.data.shifts_by_role[] | select(.role_name == $role) | .shifts | length')
        ACTUAL_FILLED=$(echo "$EVENT_DETAILS" | jq -r --arg role "$ROLE_NAME" '.data.shifts_by_role[] | select(.role_name == $role) | .shifts | map(select(.staffing_progress.percentage == 100)) | length')
        
        # Test 4.1: Total shifts count should match
        if [ "$TOTAL_SHIFTS" = "$ACTUAL_TOTAL" ]; then
            log_test "Role $ROLE_NAME total shifts count" "PASS" "Reported: $TOTAL_SHIFTS, Actual: $ACTUAL_TOTAL"
        else
            log_test "Role $ROLE_NAME total shifts count" "FAIL" "Reported: $TOTAL_SHIFTS, Actual: $ACTUAL_TOTAL"
        fi
        
        # Test 4.2: Filled shifts count should match
        if [ "$FILLED_SHIFTS" = "$ACTUAL_FILLED" ]; then
            log_test "Role $ROLE_NAME filled shifts count" "PASS" "Reported: $FILLED_SHIFTS, Actual: $ACTUAL_FILLED"
        else
            log_test "Role $ROLE_NAME filled shifts count" "FAIL" "Reported: $FILLED_SHIFTS, Actual: $ACTUAL_FILLED"
        fi
    done
done

# Test 5: Assignment API Consistency
log_section "ASSIGNMENT API CONSISTENCY"

echo "Testing assignment creation and updates..."

# Find a shift that needs workers
SHIFT_TO_TEST=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | \
    jq -r '.data[]? | select(.shifts_by_role) | .shifts_by_role[]? | .shifts[]? | select(.staffing_progress.percentage < 100) | .id' | head -1)

if [ -n "$SHIFT_TO_TEST" ] && [ "$SHIFT_TO_TEST" != "null" ]; then
    echo "Testing with Shift ID: $SHIFT_TO_TEST"
    
    # Get shift details before assignment
    SHIFT_BEFORE=$(curl -s "$BASE_URL/api/v1/shifts/$SHIFT_TO_TEST" -b "$COOKIES_FILE")
    BEFORE_ASSIGNED=$(echo "$SHIFT_BEFORE" | jq -r '.data.staffing_progress.assigned')
    BEFORE_PERCENTAGE=$(echo "$SHIFT_BEFORE" | jq -r '.data.staffing_progress.percentage')
    
    # Find a worker to assign
    WORKER_ID=$(curl -s "$BASE_URL/api/v1/workers?active=true" -b "$COOKIES_FILE" | \
        jq -r '.data[0]?.id')
    
    if [ -n "$WORKER_ID" ] && [ "$WORKER_ID" != "null" ]; then
        echo "Testing assignment with Worker ID: $WORKER_ID"
        
        # Test 5.1: Assignment creation
        ASSIGNMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/staffing" -b "$COOKIES_FILE" \
            -H "Content-Type: application/json" \
            -d "{\"assignment\": {\"shift_id\": $SHIFT_TO_TEST, \"worker_id\": $WORKER_ID, \"status\": \"assigned\"}}")
        
        if echo "$ASSIGNMENT_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
            log_test "Assignment creation" "PASS" "Successfully created assignment"
            
            # Test 5.2: Verify shift staffing progress updated
            sleep 1  # Give time for update
            SHIFT_AFTER=$(curl -s "$BASE_URL/api/v1/shifts/$SHIFT_TO_TEST" -b "$COOKIES_FILE")
            AFTER_ASSIGNED=$(echo "$SHIFT_AFTER" | jq -r '.data.staffing_progress.assigned')
            AFTER_PERCENTAGE=$(echo "$SHIFT_AFTER" | jq -r '.data.staffing_progress.percentage')
            
            EXPECTED_ASSIGNED=$((BEFORE_ASSIGNED + 1))
            if [ "$AFTER_ASSIGNED" = "$EXPECTED_ASSIGNED" ]; then
                log_test "Shift staffing progress update" "PASS" "Assigned count: $BEFORE_ASSIGNED → $AFTER_ASSIGNED"
            else
                log_test "Shift staffing progress update" "FAIL" "Expected: $EXPECTED_ASSIGNED, Got: $AFTER_ASSIGNED"
            fi
            
            # Test 5.3: Verify percentage calculation
            if [ "$AFTER_PERCENTAGE" = "100" ]; then
                log_test "Shift percentage after assignment" "PASS" "Correctly shows 100% when full"
            else
                log_test "Shift percentage after assignment" "FAIL" "Expected 100%, got $AFTER_PERCENTAGE%"
            fi
            
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
        log_test "Assignment test" "SKIP" "No workers available for testing"
    fi
else
    log_test "Assignment test" "SKIP" "No shifts available for testing"
fi

# Test 6: Edge Cases and Boundary Conditions
log_section "EDGE CASES AND BOUNDARY CONDITIONS"

echo "Testing edge cases..."

# Test 6.1: Event with no shifts
NO_SHIFTS_EVENT=$(curl -s "$BASE_URL/api/v1/events?tab=draft" -b "$COOKIES_FILE" | \
    jq -r '.data[] | select(.shifts_count == 0) | .id' | head -1)

if [ -n "$NO_SHIFTS_EVENT" ] && [ "$NO_SHIFTS_EVENT" != "null" ]; then
    NO_SHIFTS_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$NO_SHIFTS_EVENT" -b "$COOKIES_FILE")
    TOTAL_NEEDED=$(echo "$NO_SHIFTS_DETAILS" | jq -r '.data.total_workers_needed')
    ASSIGNED_COUNT=$(echo "$NO_SHIFTS_DETAILS" | jq -r '.data.assigned_workers_count')
    
    if [ "$TOTAL_NEEDED" = "0" ] && [ "$ASSIGNED_COUNT" = "0" ]; then
        log_test "Event with no shifts" "PASS" "Correctly shows 0/0 workers"
    else
        log_test "Event with no shifts" "FAIL" "Expected 0/0, got $ASSIGNED_COUNT/$TOTAL_NEEDED"
    fi
fi

# Test 6.2: Fully staffed event
FULLY_STAFFED_EVENT=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | \
    jq -r '.data[] | select(.staffing_percentage == 100) | .id' | head -1)

if [ -n "$FULLY_STAFFED_EVENT" ] && [ "$FULLY_STAFFED_EVENT" != "null" ]; then
    FULLY_STAFFED_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$FULLY_STAFFED_EVENT" -b "$COOKIES_FILE")
    
    # Check that all shifts are fully staffed
    ALL_FULLY_STAFFED=$(echo "$FULLY_STAFFED_DETAILS" | jq -r '.data.shifts_by_role[] | .shifts[] | select(.staffing_progress.percentage != 100) | .id' | wc -l)
    
    if [ "$ALL_FULLY_STAFFED" = "0" ]; then
        log_test "Fully staffed event consistency" "PASS" "All shifts show 100% staffing"
    else
        log_test "Fully staffed event consistency" "FAIL" "Found shifts not at 100% in fully staffed event"
    fi
fi

# Test 7: Frontend-Backend Consistency
log_section "FRONTEND-BACKEND CONSISTENCY"

echo "Testing frontend page loads..."

# Test 7.1: Events page loads
EVENTS_PAGE_RESPONSE=$(curl -s "$FRONTEND_URL/events" | head -20)
if echo "$EVENTS_PAGE_RESPONSE" | grep -q "root\|vite\|react"; then
    log_test "Events page loads" "PASS" "Frontend page loads successfully"
else
    log_test "Events page loads" "FAIL" "Frontend page failed to load"
fi

# Test 7.2: Workers page loads
WORKERS_PAGE_RESPONSE=$(curl -s "$FRONTEND_URL/workers" | head -20)
if echo "$WORKERS_PAGE_RESPONSE" | grep -q "root\|vite\|react"; then
    log_test "Workers page loads" "PASS" "Frontend page loads successfully"
else
    log_test "Workers page loads" "FAIL" "Frontend page failed to load"
fi

# Test 7.3: Dashboard page loads
DASHBOARD_PAGE_RESPONSE=$(curl -s "$FRONTEND_URL/dashboard" | head -20)
if echo "$DASHBOARD_PAGE_RESPONSE" | grep -q "root\|vite\|react"; then
    log_test "Dashboard page loads" "PASS" "Frontend page loads successfully"
else
    log_test "Dashboard page loads" "FAIL" "Frontend page failed to load"
fi

# Test 8: Data Integrity Checks
log_section "DATA INTEGRITY CHECKS"

echo "Performing data integrity checks..."

# Test 8.1: No orphaned assignments
ORPHANED_ASSIGNMENTS=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | \
    jq -r '.data[] | .shifts_by_role[]? | .shifts[]? | .assignments[]? | select(.worker == null) | .id' | wc -l)

if [ "$ORPHANED_ASSIGNMENTS" = "0" ]; then
    log_test "No orphaned assignments" "PASS" "All assignments have valid workers"
else
    log_test "No orphaned assignments" "FAIL" "Found $ORPHANED_ASSIGNMENTS orphaned assignments"
fi

# Test 8.2: No shifts with null role_needed
NULL_ROLE_SHIFTS=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | \
    jq -r '.data[] | .shifts_by_role[]? | .shifts[]? | select(.role_needed == null or .role_needed == "") | .id' | wc -l)

if [ "$NULL_ROLE_SHIFTS" = "0" ]; then
    log_test "No shifts with null role_needed" "PASS" "All shifts have valid roles"
else
    log_test "No shifts with null role_needed" "FAIL" "Found $NULL_ROLE_SHIFTS shifts with null roles"
fi

# Test 8.3: No shifts with null capacity
NULL_CAPACITY_SHIFTS=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | \
    jq -r '.data[] | .shifts_by_role[]? | .shifts[]? | select(.capacity == null or .capacity == 0) | .id' | wc -l)

if [ "$NULL_CAPACITY_SHIFTS" = "0" ]; then
    log_test "No shifts with null/zero capacity" "PASS" "All shifts have valid capacity"
else
    log_test "No shifts with null/zero capacity" "FAIL" "Found $NULL_CAPACITY_SHIFTS shifts with invalid capacity"
fi

# Final Results
echo ""
echo -e "${BLUE}📊 TEST RESULTS SUMMARY${NC}"
echo "=================================================="
echo -e "Total Tests Run: ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}The staffing logic is working correctly across all levels.${NC}"
    echo -e "${GREEN}No abstraction level mixing bugs detected.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${RED}Please review the failed tests above and fix the issues.${NC}"
    exit 1
fi
