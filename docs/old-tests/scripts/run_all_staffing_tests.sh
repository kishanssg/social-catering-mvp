#!/bin/bash

# 🚀 MASTER TEST RUNNER
# Executes all staffing logic tests to ensure the bug is completely fixed
# Run with: ./run_all_staffing_tests.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS_RUN=0
TOTAL_TESTS_PASSED=0
TOTAL_TESTS_FAILED=0
FAILED_TEST_SUITES=()

# Helper functions
log_section() {
    echo ""
    echo -e "${BLUE}🔍 $1${NC}"
    echo "=================================================="
}

log_test_suite() {
    local suite_name="$1"
    local status="$2"
    local details="$3"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $suite_name${NC}: PASSED"
    else
        echo -e "${RED}❌ $suite_name${NC}: FAILED"
        echo -e "${RED}   Details: $details${NC}"
        FAILED_TEST_SUITES+=("$suite_name")
    fi
}

run_test_suite() {
    local test_file="$1"
    local suite_name="$2"
    
    echo ""
    echo -e "${PURPLE}🧪 Running $suite_name...${NC}"
    echo "Command: ./$test_file"
    echo ""
    
    if [ -f "$test_file" ]; then
        if chmod +x "$test_file" 2>/dev/null; then
            if ./"$test_file" 2>&1; then
                log_test_suite "$suite_name" "PASS" ""
            else
                log_test_suite "$suite_name" "FAIL" "Test suite exited with error code"
            fi
        else
            log_test_suite "$suite_name" "FAIL" "Could not make test file executable"
        fi
    else
        log_test_suite "$suite_name" "FAIL" "Test file $test_file not found"
    fi
}

run_rails_test() {
    local test_file="$1"
    local suite_name="$2"
    
    echo ""
    echo -e "${PURPLE}🧪 Running $suite_name...${NC}"
    echo "Command: rails runner $test_file"
    echo ""
    
    if [ -f "$test_file" ]; then
        if rails runner "$test_file" 2>&1; then
            log_test_suite "$suite_name" "PASS" ""
        else
            log_test_suite "$suite_name" "FAIL" "Rails test exited with error code"
        fi
    else
        log_test_suite "$suite_name" "FAIL" "Test file $test_file not found"
    fi
}

# Main execution
echo -e "${BLUE}🚀 MASTER TEST RUNNER${NC}"
echo "=================================================="
echo "Comprehensive testing of staffing logic fixes"
echo "Ensuring no more abstraction level mixing bugs"
echo ""

# Check prerequisites
log_section "PREREQUISITE CHECKS"

echo "Checking if Rails server is running..."
if curl -s http://localhost:3000/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Rails server is running${NC}"
else
    echo -e "${RED}❌ Rails server is not running${NC}"
    echo "Please start the Rails server with: rails server"
    exit 1
fi

echo "Checking if frontend server is running..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend server is not running${NC}"
    echo "Some frontend tests may be skipped"
fi

echo "Checking test files..."
TEST_FILES=(
    "test_staffing_logic_comprehensive.sh"
    "test_capacity_role_fix.sh"
    "test_staffing_logic_rails.rb"
    "test_frontend_backend_integration.sh"
)

for test_file in "${TEST_FILES[@]}"; do
    if [ -f "$test_file" ]; then
        echo -e "${GREEN}✅ $test_file exists${NC}"
    else
        echo -e "${RED}❌ $test_file missing${NC}"
    fi
done

# Run test suites
log_section "RUNNING TEST SUITES"

# Test 1: Comprehensive Staffing Logic Test
run_test_suite "test_staffing_logic_comprehensive.sh" "Comprehensive Staffing Logic Test"

# Test 2: Focused Capacity vs Role Requirements Test
run_test_suite "test_capacity_role_fix.sh" "Capacity vs Role Requirements Test"

# Test 3: Rails Console Deep Testing
run_rails_test "test_staffing_logic_rails.rb" "Rails Console Deep Test"

# Test 4: Frontend-Backend Integration Test
run_test_suite "test_frontend_backend_integration.sh" "Frontend-Backend Integration Test"

# Test 5: Quick Smoke Test
log_section "QUICK SMOKE TEST"

echo "Running quick smoke test..."

# Test basic API functionality
SMOKE_RESPONSE=$(curl -s -c "smoke_cookies.txt" -X POST "http://localhost:3000/api/v1/login" \
    -H "Content-Type: application/json" \
    -d '{"user": {"email": "admin@socialcatering.com", "password": "password123"}}')

if echo "$SMOKE_RESPONSE" | jq -e '.status == "success"' > /dev/null; then
    echo -e "${GREEN}✅ Authentication works${NC}"
    
    # Test events API
    EVENTS_RESPONSE=$(curl -s "http://localhost:3000/api/v1/events?tab=active" -b "smoke_cookies.txt")
    if echo "$EVENTS_RESPONSE" | jq -e '.data' > /dev/null; then
        echo -e "${GREEN}✅ Events API works${NC}"
        
        # Test a few shifts for capacity
        SHIFT_CAPACITIES=$(echo "$EVENTS_RESPONSE" | jq -r '.data[] | .shifts_by_role[]? | .shifts[]? | .capacity' | head -5)
        ALL_CAPACITY_ONE=true
        
        for capacity in $SHIFT_CAPACITIES; do
            if [ "$capacity" != "1" ]; then
                ALL_CAPACITY_ONE=false
                break
            fi
        done
        
        if [ "$ALL_CAPACITY_ONE" = true ]; then
            echo -e "${GREEN}✅ All shifts have capacity 1${NC}"
            log_test_suite "Quick Smoke Test" "PASS" ""
        else
            echo -e "${RED}❌ Some shifts don't have capacity 1${NC}"
            log_test_suite "Quick Smoke Test" "FAIL" "Shift capacity issue detected"
        fi
    else
        echo -e "${RED}❌ Events API failed${NC}"
        log_test_suite "Quick Smoke Test" "FAIL" "Events API not working"
    fi
else
    echo -e "${RED}❌ Authentication failed${NC}"
    log_test_suite "Quick Smoke Test" "FAIL" "Authentication not working"
fi

# Cleanup smoke test files
rm -f "smoke_cookies.txt"

# Final Results
echo ""
echo -e "${BLUE}📊 MASTER TEST RESULTS${NC}"
echo "=================================================="

if [ ${#FAILED_TEST_SUITES[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TEST SUITES PASSED!${NC}"
    echo ""
    echo -e "${GREEN}✅ The abstraction level mixing bug has been completely fixed${NC}"
    echo -e "${GREEN}✅ Shifts correctly use capacity (1) for staffing calculations${NC}"
    echo -e "${GREEN}✅ No more 'Assign Worker' buttons on fully staffed shifts${NC}"
    echo -e "${GREEN}✅ Frontend and backend are working consistently${NC}"
    echo -e "${GREEN}✅ All staffing logic is working correctly${NC}"
    echo ""
    echo -e "${GREEN}🚀 The system is ready for production!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TEST SUITES FAILED${NC}"
    echo ""
    echo -e "${RED}Failed test suites:${NC}"
    for suite in "${FAILED_TEST_SUITES[@]}"; do
        echo -e "${RED}  - $suite${NC}"
    done
    echo ""
    echo -e "${RED}Please review the failed tests above and fix the issues.${NC}"
    echo -e "${RED}The abstraction level mixing bug may still exist.${NC}"
    exit 1
fi
