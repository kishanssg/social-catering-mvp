#!/bin/bash

# 🎯 FOCUSED TEST: SHIFT CAPACITY VS ROLE REQUIREMENTS
# Tests the specific bug we just fixed: abstraction level mixing
# Ensures shifts use capacity (1) not role requirements (2+) for staffing calculations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
COOKIES_FILE="test_capacity_cookies.txt"

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
}

# Set up cleanup trap
trap cleanup EXIT

echo -e "${BLUE}🎯 FOCUSED TEST: SHIFT CAPACITY VS ROLE REQUIREMENTS${NC}"
echo "=================================================="
echo "Testing the specific abstraction level mixing bug"
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

# Test 1: Find Events with Multiple Workers per Role
log_section "FINDING EVENTS WITH MULTIPLE WORKERS PER ROLE"

echo "Looking for events where a role needs multiple workers..."

EVENTS_RESPONSE=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE")
MULTI_WORKER_EVENTS=$(echo "$EVENTS_RESPONSE" | jq -r '.data[] | select(.shifts_by_role) | select(.shifts_by_role[]? | .total_shifts > 1) | .id')

if [ -z "$MULTI_WORKER_EVENTS" ]; then
    echo -e "${YELLOW}⚠️  No events found with multiple workers per role${NC}"
    echo "Creating a test event..."
    
    # Create a test event with multiple workers per role
    CREATE_EVENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/events" -b "$COOKIES_FILE" \
        -H "Content-Type: application/json" \
        -d '{
            "event": {
                "title": "Test Multi-Worker Event",
                "status": "published",
                "venue_id": 1,
                "check_in_instructions": "Test instructions",
                "supervisor_name": "Test Supervisor",
                "supervisor_phone": "555-0123",
                "skill_requirements": [
                    {
                        "skill_name": "Server",
                        "needed_workers": 2,
                        "description": "Test server role",
                        "uniform_name": "Black & White",
                        "pay_rate": 15.00
                    }
                ],
                "schedule": {
                    "start_time_utc": "'$(date -u -d '+1 day 10:00' '+%Y-%m-%dT%H:%M:%S.000Z')'",
                    "end_time_utc": "'$(date -u -d '+1 day 18:00' '+%Y-%m-%dT%H:%M:%S.000Z')'",
                    "break_minutes": 30
                },
                "auto_publish": true
            }
        }')
    
    if echo "$CREATE_EVENT_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
        TEST_EVENT_ID=$(echo "$CREATE_EVENT_RESPONSE" | jq -r '.data.id')
        echo "Created test event with ID: $TEST_EVENT_ID"
        MULTI_WORKER_EVENTS="$TEST_EVENT_ID"
    else
        echo -e "${RED}❌ Failed to create test event${NC}"
        exit 1
    fi
fi

# Test 2: Detailed Analysis of Each Multi-Worker Event
log_section "DETAILED ANALYSIS OF MULTI-WORKER EVENTS"

for EVENT_ID in $MULTI_WORKER_EVENTS; do
    echo "Analyzing Event ID: $EVENT_ID"
    
    EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
    EVENT_TITLE=$(echo "$EVENT_DETAILS" | jq -r '.data.title')
    
    echo "Event: $EVENT_TITLE"
    
    # Test each role that has multiple shifts
    echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role[] | select(.total_shifts > 1) | "\(.role_name):\(.total_shifts):\(.filled_shifts)"' | while read -r role_info; do
        ROLE_NAME=$(echo "$role_info" | cut -d: -f1)
        TOTAL_SHIFTS=$(echo "$role_info" | cut -d: -f2)
        FILLED_SHIFTS=$(echo "$role_info" | cut -d: -f3)
        
        echo "  Role: $ROLE_NAME (needs $TOTAL_SHIFTS workers, has $FILLED_SHIFTS assigned)"
        
        # Test each individual shift
        echo "$EVENT_DETAILS" | jq -r --arg role "$ROLE_NAME" '.data.shifts_by_role[] | select(.role_name == $role) | .shifts[] | "\(.id):\(.staffing_progress.assigned):\(.staffing_progress.required):\(.staffing_progress.percentage)"' | while read -r shift_info; do
            SHIFT_ID=$(echo "$shift_info" | cut -d: -f1)
            ASSIGNED=$(echo "$shift_info" | cut -d: -f2)
            REQUIRED=$(echo "$shift_info" | cut -d: -f3)
            PERCENTAGE=$(echo "$shift_info" | cut -d: -f4)
            
            echo "    Shift $SHIFT_ID: $ASSIGNED/$REQUIRED assigned ($PERCENTAGE%)"
            
            # Test 2.1: Each shift should have capacity = 1
            if [ "$REQUIRED" = "1" ]; then
                log_test "Shift $SHIFT_ID capacity" "PASS" "Capacity is 1 (correct)"
            else
                log_test "Shift $SHIFT_ID capacity" "FAIL" "Capacity is $REQUIRED, should be 1"
            fi
            
            # Test 2.2: Percentage should be based on capacity, not role requirements
            EXPECTED_PERCENTAGE=$((ASSIGNED * 100 / REQUIRED))
            if [ "$PERCENTAGE" = "$EXPECTED_PERCENTAGE" ]; then
                log_test "Shift $SHIFT_ID percentage calculation" "PASS" "Percentage $PERCENTAGE% is correct"
            else
                log_test "Shift $SHIFT_ID percentage calculation" "FAIL" "Expected $EXPECTED_PERCENTAGE%, got $PERCENTAGE%"
            fi
            
            # Test 2.3: Fully staffed logic should use capacity
            if [ "$ASSIGNED" = "$REQUIRED" ] && [ "$PERCENTAGE" = "100" ]; then
                log_test "Shift $SHIFT_ID fully staffed logic" "PASS" "Correctly identified as fully staffed"
            elif [ "$ASSIGNED" -lt "$REQUIRED" ] && [ "$PERCENTAGE" -lt "100" ]; then
                log_test "Shift $SHIFT_ID fully staffed logic" "PASS" "Correctly identified as not fully staffed"
            else
                log_test "Shift $SHIFT_ID fully staffed logic" "FAIL" "Inconsistent staffing status"
            fi
        done
    done
done

# Test 3: Assignment Test with Multi-Worker Role
log_section "ASSIGNMENT TEST WITH MULTI-WORKER ROLE"

# Find a shift in a multi-worker role that needs workers
SHIFT_TO_TEST=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | \
    jq -r '.data[] | select(.shifts_by_role) | .shifts_by_role[] | select(.total_shifts > 1) | .shifts[] | select(.staffing_progress.percentage < 100) | .id' | head -1)

if [ -n "$SHIFT_TO_TEST" ] && [ "$SHIFT_TO_TEST" != "null" ]; then
    echo "Testing assignment with Shift ID: $SHIFT_TO_TEST"
    
    # Get shift details
    SHIFT_DETAILS=$(curl -s "$BASE_URL/api/v1/shifts/$SHIFT_TO_TEST" -b "$COOKIES_FILE")
    SHIFT_ROLE=$(echo "$SHIFT_DETAILS" | jq -r '.data.role_needed')
    BEFORE_ASSIGNED=$(echo "$SHIFT_DETAILS" | jq -r '.data.staffing_progress.assigned')
    BEFORE_PERCENTAGE=$(echo "$SHIFT_DETAILS" | jq -r '.data.staffing_progress.percentage')
    
    echo "Shift Role: $SHIFT_ROLE"
    echo "Before assignment: $BEFORE_ASSIGNED/1 assigned ($BEFORE_PERCENTAGE%)"
    
    # Find a worker to assign
    WORKER_ID=$(curl -s "$BASE_URL/api/v1/workers?active=true" -b "$COOKIES_FILE" | \
        jq -r --arg role "$SHIFT_ROLE" '.data[]? | select(.skills_json | contains([$role])) | .id' | head -1)
    
    if [ -z "$WORKER_ID" ] || [ "$WORKER_ID" = "null" ]; then
        # Fallback to any worker
        WORKER_ID=$(curl -s "$BASE_URL/api/v1/workers?active=true" -b "$COOKIES_FILE" | \
            jq -r '.data[0]?.id')
    fi
    
    if [ -n "$WORKER_ID" ] && [ "$WORKER_ID" != "null" ]; then
        echo "Testing assignment with Worker ID: $WORKER_ID"
        
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
            
            echo "After assignment: $AFTER_ASSIGNED/1 assigned ($AFTER_PERCENTAGE%)"
            
            # Test 3.1: Should now be fully staffed (100%)
            if [ "$AFTER_PERCENTAGE" = "100" ]; then
                log_test "Shift fully staffed after assignment" "PASS" "Correctly shows 100% when capacity is filled"
            else
                log_test "Shift fully staffed after assignment" "FAIL" "Expected 100%, got $AFTER_PERCENTAGE%"
            fi
            
            # Test 3.2: Assigned count should be 1
            if [ "$AFTER_ASSIGNED" = "1" ]; then
                log_test "Shift assigned count" "PASS" "Correctly shows 1 assigned worker"
            else
                log_test "Shift assigned count" "FAIL" "Expected 1, got $AFTER_ASSIGNED"
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

# Test 4: Role-Level vs Shift-Level Consistency
log_section "ROLE-LEVEL VS SHIFT-LEVEL CONSISTENCY"

for EVENT_ID in $MULTI_WORKER_EVENTS; do
    echo "Testing Event ID: $EVENT_ID consistency..."
    
    EVENT_DETAILS=$(curl -s "$BASE_URL/api/v1/events/$EVENT_ID" -b "$COOKIES_FILE")
    
    # Test each role with multiple shifts
    echo "$EVENT_DETAILS" | jq -r '.data.shifts_by_role[] | select(.total_shifts > 1) | "\(.role_name):\(.total_shifts):\(.filled_shifts)"' | while read -r role_info; do
        ROLE_NAME=$(echo "$role_info" | cut -d: -f1)
        TOTAL_SHIFTS=$(echo "$role_info" | cut -d: -f2)
        FILLED_SHIFTS=$(echo "$role_info" | cut -d: -f3)
        
        # Count actual filled shifts
        ACTUAL_FILLED=$(echo "$EVENT_DETAILS" | jq -r --arg role "$ROLE_NAME" '.data.shifts_by_role[] | select(.role_name == $role) | .shifts | map(select(.staffing_progress.percentage == 100)) | length')
        
        # Test 4.1: Role-level filled count should match shift-level count
        if [ "$FILLED_SHIFTS" = "$ACTUAL_FILLED" ]; then
            log_test "Role $ROLE_NAME filled count consistency" "PASS" "Role: $FILLED_SHIFTS, Shifts: $ACTUAL_FILLED"
        else
            log_test "Role $ROLE_NAME filled count consistency" "FAIL" "Role: $FILLED_SHIFTS, Shifts: $ACTUAL_FILLED"
        fi
        
        # Test 4.2: Role-level total should match shift-level total
        ACTUAL_TOTAL=$(echo "$EVENT_DETAILS" | jq -r --arg role "$ROLE_NAME" '.data.shifts_by_role[] | select(.role_name == $role) | .shifts | length')
        
        if [ "$TOTAL_SHIFTS" = "$ACTUAL_TOTAL" ]; then
            log_test "Role $ROLE_NAME total count consistency" "PASS" "Role: $TOTAL_SHIFTS, Shifts: $ACTUAL_TOTAL"
        else
            log_test "Role $ROLE_NAME total count consistency" "FAIL" "Role: $TOTAL_SHIFTS, Shifts: $ACTUAL_TOTAL"
        fi
    done
done

# Test 5: Edge Case - Single Worker Role
log_section "EDGE CASE: SINGLE WORKER ROLE"

echo "Testing roles that need only 1 worker..."

SINGLE_WORKER_ROLES=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | \
    jq -r '.data[] | select(.shifts_by_role) | .shifts_by_role[] | select(.total_shifts == 1) | "\(.role_name):\(.filled_shifts)"')

if [ -n "$SINGLE_WORKER_ROLES" ]; then
    echo "$SINGLE_WORKER_ROLES" | while read -r role_info; do
        ROLE_NAME=$(echo "$role_info" | cut -d: -f1)
        FILLED_SHIFTS=$(echo "$role_info" | cut -d: -f2)
        
        # For single-worker roles, filled should be 0 or 1
        if [ "$FILLED_SHIFTS" = "0" ] || [ "$FILLED_SHIFTS" = "1" ]; then
            log_test "Single worker role $ROLE_NAME" "PASS" "Filled shifts: $FILLED_SHIFTS (valid)"
        else
            log_test "Single worker role $ROLE_NAME" "FAIL" "Filled shifts: $FILLED_SHIFTS (should be 0 or 1)"
        fi
    done
else
    log_test "Single worker role test" "SKIP" "No single-worker roles found"
fi

# Clean up test event if we created one
if [ -n "$TEST_EVENT_ID" ]; then
    echo ""
    echo "Cleaning up test event..."
    DELETE_EVENT_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/v1/events/$TEST_EVENT_ID" -b "$COOKIES_FILE")
    if echo "$DELETE_EVENT_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
        echo "Test event cleaned up successfully"
    else
        echo "Warning: Failed to clean up test event"
    fi
fi

# Final Results
echo ""
echo -e "${BLUE}📊 FOCUSED TEST RESULTS${NC}"
echo "=================================================="
echo -e "Total Tests Run: ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}The abstraction level mixing bug has been fixed.${NC}"
    echo -e "${GREEN}Shifts correctly use capacity (1) for staffing calculations.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${RED}The abstraction level mixing bug may still exist.${NC}"
    echo -e "${RED}Please review the failed tests above.${NC}"
    exit 1
fi
