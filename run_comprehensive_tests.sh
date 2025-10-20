#!/bin/bash
# run_comprehensive_tests.sh
# Master test runner for the comprehensive test suite from tests.md

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        if [ -n "$details" ]; then
            echo -e "   ${RED}Details: $details${NC}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to run a test suite
run_test_suite() {
    local suite_name="$1"
    local command="$2"
    
    echo -e "\n${BLUE}🧪 Running $suite_name...${NC}"
    echo "Command: $command"
    
    if eval "$command"; then
        log_test_result "$suite_name" "PASS"
    else
        log_test_result "$suite_name" "FAIL" "Command failed with exit code $?"
    fi
}

# Function to check if a file exists
check_file_exists() {
    local file_path="$1"
    local description="$2"
    
    if [ -f "$file_path" ]; then
        log_test_result "$description" "PASS"
    else
        log_test_result "$description" "FAIL" "File not found: $file_path"
    fi
}

# Function to check if a command exists
check_command_exists() {
    local command="$1"
    local description="$2"
    
    if command -v "$command" >/dev/null 2>&1; then
        log_test_result "$description" "PASS"
    else
        log_test_result "$description" "FAIL" "Command not found: $command"
    fi
}

echo -e "${BLUE}🚀 Starting Comprehensive Test Suite${NC}"
echo -e "${BLUE}=====================================${NC}"

# Prerequisites check
echo -e "\n${YELLOW}📋 Checking Prerequisites...${NC}"

check_command_exists "bundle" "Bundler installed"
check_command_exists "rails" "Rails CLI available"
check_command_exists "rspec" "RSpec installed"
check_command_exists "npm" "Node.js/npm available"

# Check if we're in the right directory
if [ ! -f "Gemfile" ]; then
    echo -e "${RED}❌ Error: Not in Rails project root directory${NC}"
    exit 1
fi

if [ ! -f "social-catering-ui/package.json" ]; then
    echo -e "${RED}❌ Error: Frontend directory not found${NC}"
    exit 1
fi

# Install dependencies
echo -e "\n${YELLOW}📦 Installing Dependencies...${NC}"

if bundle install; then
    log_test_result "Backend dependencies installed" "PASS"
else
    log_test_result "Backend dependencies installed" "FAIL" "Bundle install failed"
fi

cd social-catering-ui
if npm install; then
    log_test_result "Frontend dependencies installed" "PASS"
else
    log_test_result "Frontend dependencies installed" "FAIL" "NPM install failed"
fi
cd ..

# Check test files exist
echo -e "\n${YELLOW}📁 Checking Test Files...${NC}"

# Backend test files
check_file_exists "spec/models/shift_spec.rb" "Shift model tests"
check_file_exists "spec/models/event_spec.rb" "Event model tests"
check_file_exists "spec/models/worker_spec.rb" "Worker model tests"
check_file_exists "spec/services/shift_assignment_service_spec.rb" "Shift assignment service tests"
check_file_exists "spec/services/event_publishing_service_spec.rb" "Event publishing service tests"
check_file_exists "spec/requests/api/v1/shifts_spec.rb" "Shifts API tests"
check_file_exists "spec/requests/api/v1/events_spec.rb" "Events API tests"
check_file_exists "spec/system/worker_assignment_flow_spec.rb" "Worker assignment flow tests"
check_file_exists "spec/edge_cases/capacity_edge_cases_spec.rb" "Capacity edge case tests"
check_file_exists "spec/edge_cases/time_overlap_edge_cases_spec.rb" "Time overlap edge case tests"
check_file_exists "spec/performance/query_performance_spec.rb" "Query performance tests"

# Factory files
check_file_exists "spec/factories/shifts.rb" "Shift factory"
check_file_exists "spec/factories/events.rb" "Event factory"
check_file_exists "spec/factories/workers.rb" "Worker factory"
check_file_exists "spec/factories/assignments.rb" "Assignment factory"
check_file_exists "spec/factories/users.rb" "User factory"
check_file_exists "spec/factories/venues.rb" "Venue factory"
check_file_exists "spec/factories/event_skill_requirements.rb" "Event skill requirement factory"

# Frontend test files
check_file_exists "social-catering-ui/src/components/ShiftCard.test.tsx" "ShiftCard component tests"
check_file_exists "social-catering-ui/src/components/EventStaffingProgress.test.tsx" "EventStaffingProgress component tests"
check_file_exists "social-catering-ui/jest.config.js" "Jest configuration"
check_file_exists "social-catering-ui/src/setupTests.ts" "Jest setup"

# Run backend tests
echo -e "\n${YELLOW}🔧 Running Backend Tests...${NC}"

# Model unit tests
run_test_suite "Shift Model Tests" "bundle exec rspec spec/models/shift_spec.rb"
run_test_suite "Event Model Tests" "bundle exec rspec spec/models/event_spec.rb"
run_test_suite "Worker Model Tests" "bundle exec rspec spec/models/worker_spec.rb"

# Service object tests
run_test_suite "Shift Assignment Service Tests" "bundle exec rspec spec/services/shift_assignment_service_spec.rb"
run_test_suite "Event Publishing Service Tests" "bundle exec rspec spec/services/event_publishing_service_spec.rb"

# API integration tests
run_test_suite "Shifts API Tests" "bundle exec rspec spec/requests/api/v1/shifts_spec.rb"
run_test_suite "Events API Tests" "bundle exec rspec spec/requests/api/v1/events_spec.rb"

# Edge case tests
run_test_suite "Capacity Edge Case Tests" "bundle exec rspec spec/edge_cases/capacity_edge_cases_spec.rb"
run_test_suite "Time Overlap Edge Case Tests" "bundle exec rspec spec/edge_cases/time_overlap_edge_cases_spec.rb"

# Performance tests
run_test_suite "Query Performance Tests" "bundle exec rspec spec/performance/query_performance_spec.rb"

# System tests (if database is set up)
if rails runner "puts 'Database connection OK'" >/dev/null 2>&1; then
    run_test_suite "Worker Assignment Flow Tests" "bundle exec rspec spec/system/worker_assignment_flow_spec.rb"
else
    log_test_result "Worker Assignment Flow Tests" "SKIP" "Database not available"
fi

# Run frontend tests
echo -e "\n${YELLOW}🎨 Running Frontend Tests...${NC}"

cd social-catering-ui
run_test_suite "ShiftCard Component Tests" "npm test -- --testPathPattern=ShiftCard.test.tsx --passWithNoTests"
run_test_suite "EventStaffingProgress Component Tests" "npm test -- --testPathPattern=EventStaffingProgress.test.tsx --passWithNoTests"
cd ..

# Run the existing comprehensive test suite
echo -e "\n${YELLOW}🔍 Running Existing Comprehensive Tests...${NC}"

if [ -f "run_all_staffing_tests.sh" ]; then
    run_test_suite "Existing Staffing Logic Tests" "./run_all_staffing_tests.sh"
else
    log_test_result "Existing Staffing Logic Tests" "SKIP" "run_all_staffing_tests.sh not found"
fi

# Final results
echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}======================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! The comprehensive test suite is working correctly.${NC}"
    echo -e "${GREEN}✅ The architectural bug prevention tests are in place and functioning.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the output above.${NC}"
    echo -e "${YELLOW}💡 This test suite is designed to catch architectural bugs early.${NC}"
    echo -e "${YELLOW}💡 Any failures indicate potential issues that need attention.${NC}"
    exit 1
fi
