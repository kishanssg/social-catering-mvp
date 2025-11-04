#!/bin/bash

# Simplified Comprehensive Test Script
# Tests core functionality without complex jq parsing

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
ADMIN_EMAIL="admin@socialcatering.com"
ADMIN_PASSWORD="password123"
COOKIES_FILE="test_cookies.txt"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_test() {
    local test_name="$1"
    local result="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $test_name${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

test_api_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local test_name="$3"
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint" -b "$COOKIES_FILE")
    
    if [ "$response" = "$expected_status" ]; then
        log_test "$test_name" "PASS"
    else
        log_test "$test_name (Expected: $expected_status, Got: $response)" "FAIL"
    fi
}

test_frontend_page() {
    local page="$1"
    local test_name="$2"
    
    local response=$(curl -s "$FRONTEND_URL$page")
    
    if echo "$response" | grep -q "root" && echo "$response" | grep -q "vite"; then
        log_test "$test_name" "PASS"
    else
        log_test "$test_name" "FAIL"
    fi
}

# Login function
login() {
    echo -e "${BLUE}🔐 Logging in as admin...${NC}"
    LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/api/v1/login" \
        -H "Content-Type: application/json" \
        -d "{\"user\":{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}}" \
        -c "$COOKIES_FILE" -s)
    
    if echo "$LOGIN_RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✅ Login successful${NC}"
        return 0
    else
        echo -e "${RED}❌ Login failed${NC}"
        return 1
    fi
}

logout() {
    curl -X DELETE "$BASE_URL/api/v1/logout" -b "$COOKIES_FILE" -s > /dev/null
    rm -f "$COOKIES_FILE"
}

# Main test execution
echo -e "${BLUE}🚀 COMPREHENSIVE FUNCTIONALITY TEST${NC}"
echo -e "${BLUE}=====================================${NC}"

# Login first
login
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cannot proceed without authentication${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📋 TESTING ALL API ENDPOINTS${NC}"
echo -e "${YELLOW}============================${NC}"

# Test all API endpoints
test_api_endpoint "/api/v1/dashboard" "200" "Dashboard API"
test_api_endpoint "/api/v1/events" "200" "Events List API"
test_api_endpoint "/api/v1/events?tab=draft" "200" "Events Draft Tab API"
test_api_endpoint "/api/v1/events?tab=active" "200" "Events Active Tab API"
test_api_endpoint "/api/v1/events?tab=past" "200" "Events Past Tab API"
test_api_endpoint "/api/v1/workers" "200" "Workers List API"
test_api_endpoint "/api/v1/workers?active=true" "200" "Active Workers API"
test_api_endpoint "/api/v1/venues/search?query=tallahassee" "200" "Venues Search API"
test_api_endpoint "/api/v1/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" "200" "Timesheet Export API"
test_api_endpoint "/api/v1/reports/payroll?start_date=2025-10-01&end_date=2025-12-31" "200" "Payroll Export API"

echo -e "\n${YELLOW}🌐 TESTING ALL FRONTEND PAGES${NC}"
echo -e "${YELLOW}=============================${NC}"

# Test all frontend pages
test_frontend_page "/" "Home/Dashboard Page"
test_frontend_page "/login" "Login Page"
test_frontend_page "/events" "Events Page"
test_frontend_page "/events?tab=draft" "Events Draft Tab"
test_frontend_page "/events?tab=active" "Events Active Tab"
test_frontend_page "/events?tab=past" "Events Past Tab"
test_frontend_page "/workers" "Workers Page"
test_frontend_page "/reports" "Reports Page"

echo -e "\n${YELLOW}🔧 TESTING CORE FUNCTIONALITY${NC}"
echo -e "${YELLOW}=============================${NC}"

# Test Event Creation
echo -e "\n${BLUE}Testing Event Creation:${NC}"
VENUE_ID=$(curl -s "$BASE_URL/api/v1/venues/search?query=tallahassee" -b "$COOKIES_FILE" | jq -r '.cached[0].id')
CREATE_RESPONSE=$(curl -X POST "$BASE_URL/api/v1/events" \
    -H "Content-Type: application/json" \
    -d "{
        \"event\": {
            \"title\": \"Test Event $(date +%s)\",
            \"venue_id\": $VENUE_ID,
            \"schedule\": {
                \"start_time_utc\": \"2025-12-25T18:00:00Z\",
                \"end_time_utc\": \"2025-12-25T22:00:00Z\",
                \"break_minutes\": 30
            },
            \"skill_requirements\": [
                {
                    \"skill_name\": \"Server\",
                    \"needed_workers\": 2,
                    \"pay_rate\": 15.00
                }
            ]
        }
    }" \
    -b "$COOKIES_FILE" -s)

if echo "$CREATE_RESPONSE" | grep -q "success"; then
    log_test "Create Event" "PASS"
else
    log_test "Create Event" "FAIL"
fi

# Test Worker Creation
echo -e "\n${BLUE}Testing Worker Creation:${NC}"
CREATE_WORKER_RESPONSE=$(curl -X POST "$BASE_URL/api/v1/workers" \
    -H "Content-Type: application/json" \
    -d "{
        \"worker\": {
            \"first_name\": \"Test\",
            \"last_name\": \"Worker\",
            \"email\": \"test.worker.$(date +%s)@example.com\",
            \"phone\": \"555-1234\",
            \"skills_json\": [\"Server\", \"Bartender\"],
            \"active\": true
        }
    }" \
    -b "$COOKIES_FILE" -s)

if echo "$CREATE_WORKER_RESPONSE" | grep -q "success"; then
    log_test "Create Worker" "PASS"
else
    log_test "Create Worker" "FAIL"
fi

# Test Assignment
echo -e "\n${BLUE}Testing Assignment:${NC}"
# Get existing shift and worker
EXISTING_SHIFT=$(curl -s "$BASE_URL/api/v1/events?tab=active" -b "$COOKIES_FILE" | jq -r '.data[0].shifts_by_role[0].shifts[0].id // empty')
EXISTING_WORKER=$(curl -s "$BASE_URL/api/v1/workers?active=true" -b "$COOKIES_FILE" | jq -r '.data.workers[0].id // empty')

if [ -n "$EXISTING_SHIFT" ] && [ -n "$EXISTING_WORKER" ]; then
    ASSIGN_RESPONSE=$(curl -X POST "$BASE_URL/api/v1/staffing" \
        -H "Content-Type: application/json" \
        -d "{
            \"shift_id\": $EXISTING_SHIFT,
            \"worker_id\": $EXISTING_WORKER,
            \"status\": \"assigned\"
        }" \
        -b "$COOKIES_FILE" -s)
    
    if echo "$ASSIGN_RESPONSE" | grep -q "success"; then
        log_test "Single Worker Assignment" "PASS"
    else
        log_test "Single Worker Assignment" "FAIL"
    fi
else
    log_test "Single Worker Assignment (No test data)" "SKIP"
fi

# Test CSV Exports
echo -e "\n${BLUE}Testing CSV Exports:${NC}"
TIMESHEET_CSV=$(curl -s "$BASE_URL/api/v1/reports/timesheet?start_date=2025-10-01&end_date=2025-12-31" -b "$COOKIES_FILE")
if [[ -n "$TIMESHEET_CSV" && $(echo "$TIMESHEET_CSV" | head -n 1) == *"WORKER_FIRSTNAME"* ]]; then
    log_test "Timesheet CSV Export" "PASS"
else
    log_test "Timesheet CSV Export" "FAIL"
fi

PAYROLL_CSV=$(curl -s "$BASE_URL/api/v1/reports/payroll?start_date=2025-10-01&end_date=2025-12-31" -b "$COOKIES_FILE")
if [[ -n "$PAYROLL_CSV" && $(echo "$PAYROLL_CSV" | head -n 1) == *"Date,Event/Client"* ]]; then
    log_test "Payroll CSV Export" "PASS"
else
    log_test "Payroll CSV Export" "FAIL"
fi

# Test Search
echo -e "\n${BLUE}Testing Search:${NC}"
EVENT_SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/v1/events?search=test" -b "$COOKIES_FILE")
if echo "$EVENT_SEARCH_RESPONSE" | grep -q "success"; then
    log_test "Event Search" "PASS"
else
    log_test "Event Search" "FAIL"
fi

WORKER_SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/v1/workers?search=test" -b "$COOKIES_FILE")
if echo "$WORKER_SEARCH_RESPONSE" | grep -q "success"; then
    log_test "Worker Search" "PASS"
else
    log_test "Worker Search" "FAIL"
fi

# Test Error Handling
echo -e "\n${BLUE}Testing Error Handling:${NC}"
NOT_FOUND_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/v1/events/99999" -b "$COOKIES_FILE")
if [ "$NOT_FOUND_RESPONSE" = "404" ]; then
    log_test "404 Error Handling" "PASS"
else
    log_test "404 Error Handling" "FAIL"
fi

# Logout
logout

echo -e "\n${BLUE}📊 TEST RESULTS SUMMARY${NC}"
echo -e "${BLUE}=======================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Application is production-ready.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ $FAILED_TESTS tests failed. Application needs fixes before production.${NC}"
    exit 1
fi
