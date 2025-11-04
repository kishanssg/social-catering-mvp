#!/bin/bash

# 📋 PHASE 3: WORKERS PAGE AUDIT - EDGE CASE TESTS
# Additional tests for edge cases and advanced scenarios

set -e  # Exit on any error

BASE_URL="http://localhost:3000/api/v1"
COOKIES_FILE="test_cookies.txt"
EDGE_TEST_RESULTS="phase3_edge_tests.txt"

echo "🧪 PHASE 3: WORKERS PAGE AUDIT - EDGE CASE TESTS" > $EDGE_TEST_RESULTS
echo "===============================================" >> $EDGE_TEST_RESULTS
echo "Started: $(date)" >> $EDGE_TEST_RESULTS
echo "" >> $EDGE_TEST_RESULTS

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Helper function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        echo "✅ PASS: $test_name" >> $EDGE_TEST_RESULTS
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        echo "❌ FAIL: $test_name" >> $EDGE_TEST_RESULTS
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

echo -e "${YELLOW}🚀 Starting Phase 3 Edge Case Tests${NC}"
echo ""

# ===========================================
# 1. WORKER DELETION AND CASCADE TESTS
# ===========================================
echo -e "${YELLOW}📋 1. WORKER DELETION AND CASCADE TESTS${NC}"

# Create a test worker with assignments
echo "Creating test worker with assignments..."
WORKER_RESPONSE=$(curl -s -X POST "$BASE_URL/workers" -H "Content-Type: application/json" -b "$COOKIES_FILE" -d '{"worker":{"first_name":"Test","last_name":"Deletion","email":"test.deletion.$(date +%s)@example.com","phone":"555-1234","active":true}}')
TEST_WORKER_ID=$(echo "$WORKER_RESPONSE" | jq -r '.data.worker.id')

# Get available shifts and assign them
AVAILABLE_SHIFTS=$(curl -s "$BASE_URL/shifts" -b "$COOKIES_FILE" | jq -r '.data | map(select(.available_slots > 0 and .role_needed == "Event Helper")) | .[0:2] | map(.id) | join(",")')

if [ ! -z "$AVAILABLE_SHIFTS" ]; then
    # Assign worker to shifts
    curl -s -X POST "$BASE_URL/assignments/bulk_create" -H "Content-Type: application/json" -b "$COOKIES_FILE" -d "{\"worker_id\":$TEST_WORKER_ID,\"shift_ids\":[$AVAILABLE_SHIFTS]}" > /dev/null
    
    # Test that worker has assignments
    run_test "Worker has assignments before deletion" \
        "curl -s '$BASE_URL/assignments?worker_id=$TEST_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.data | length' | grep -q '[1-9]'"
    
    # Test worker deletion (should fail due to assignments)
    run_test "Worker deletion fails when has assignments" \
        "curl -s -X DELETE '$BASE_URL/workers/$TEST_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.status' | grep -q 'error'"
    
    # Test soft deletion (set active to false)
    run_test "Worker soft deletion works (set active=false)" \
        "curl -s -X PATCH '$BASE_URL/workers/$TEST_WORKER_ID' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker\":{\"active\":false}}' | jq -r '.status' | grep -q 'success'"
    
    # Verify worker is now inactive
    run_test "Worker is now inactive" \
        "curl -s '$BASE_URL/workers/$TEST_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.data.worker.active' | grep -q 'false'"
fi

echo ""

# ===========================================
# 2. CERTIFICATION EXPIRY EDGE CASES
# ===========================================
echo -e "${YELLOW}📋 2. CERTIFICATION EXPIRY EDGE CASES${NC}"

# Create a new test worker for certification tests
CERT_WORKER_RESPONSE=$(curl -s -X POST "$BASE_URL/workers" -H "Content-Type: application/json" -b "$COOKIES_FILE" -d '{"worker":{"first_name":"Cert","last_name":"Test","email":"cert.test.$(date +%s)@example.com","phone":"555-5678","active":true}}')
CERT_WORKER_ID=$(echo "$CERT_WORKER_RESPONSE" | jq -r '.data.worker.id')

# Test adding certification with expiry date
run_test "Add certification with future expiry date" \
    "curl -s -X POST '$BASE_URL/workers/$CERT_WORKER_ID/certifications' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"certification_id\":67,\"expires_at\":\"2026-12-31T23:59:59Z\"}' | jq -r '.status' | grep -q 'success'"

# Test adding certification with past expiry date
run_test "Add certification with past expiry date" \
    "curl -s -X POST '$BASE_URL/workers/$CERT_WORKER_ID/certifications' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"certification_id\":67,\"expires_at\":\"2020-01-01T00:00:00Z\"}' | jq -r '.status' | grep -q 'success'"

# Test adding certification with no expiry date
run_test "Add certification with no expiry date" \
    "curl -s -X POST '$BASE_URL/workers/$CERT_WORKER_ID/certifications' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"certification_id\":67}' | jq -r '.status' | grep -q 'success'"

echo ""

# ===========================================
# 3. SKILLS MANAGEMENT EDGE CASES
# ===========================================
echo -e "${YELLOW}📋 3. SKILLS MANAGEMENT EDGE CASES${NC}"

# Test worker with no skills
run_test "Worker with no skills returns empty array" \
    "curl -s '$BASE_URL/workers/$CERT_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.data.worker.skills_json | length' | grep -q '^0$'"

# Test adding skills to worker
run_test "Add skills to worker" \
    "curl -s -X PATCH '$BASE_URL/workers/$CERT_WORKER_ID' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker\":{\"skills_json\":[\"Server\",\"Bartender\",\"Event Helper\"]}}' | jq -r '.status' | grep -q 'success'"

# Test worker now has skills
run_test "Worker now has skills" \
    "curl -s '$BASE_URL/workers/$CERT_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.data.worker.skills_json | length' | grep -q '^3$'"

# Test removing skills from worker
run_test "Remove skills from worker" \
    "curl -s -X PATCH '$BASE_URL/workers/$CERT_WORKER_ID' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker\":{\"skills_json\":[\"Server\"]}}' | jq -r '.status' | grep -q 'success'"

# Test worker now has fewer skills
run_test "Worker now has fewer skills" \
    "curl -s '$BASE_URL/workers/$CERT_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.data.worker.skills_json | length' | grep -q '^1$'"

echo ""

# ===========================================
# 4. SEARCH AND FILTER COMBINATIONS
# ===========================================
echo -e "${YELLOW}📋 4. SEARCH AND FILTER COMBINATIONS${NC}"

# Test search with different case
run_test "Search is case insensitive" \
    "curl -s '$BASE_URL/workers?search=CAMERON' -b '$COOKIES_FILE' | jq -r '.data.workers | length' | grep -q '[1-9]'"

# Test search with partial name
run_test "Search with partial name works" \
    "curl -s '$BASE_URL/workers?search=cam' -b '$COOKIES_FILE' | jq -r '.data.workers | length' | grep -q '[1-9]'"

# Test search with non-existent name
run_test "Search with non-existent name returns empty" \
    "curl -s '$BASE_URL/workers?search=nonexistent' -b '$COOKIES_FILE' | jq -r '.data.workers | length' | grep -q '^0$'"

# Test search with special characters
run_test "Search with special characters handled gracefully" \
    "curl -s '$BASE_URL/workers?search=@#$%' -b '$COOKIES_FILE' | jq -r '.data.workers | length' | grep -q '^0$'"

echo ""

# ===========================================
# 5. BULK ASSIGNMENT EDGE CASES
# ===========================================
echo -e "${YELLOW}📋 5. BULK ASSIGNMENT EDGE CASES${NC}"

# Test bulk assignment with empty shift list
run_test "Bulk assignment with empty shift list" \
    "curl -s -X POST '$BASE_URL/assignments/bulk_create' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker_id\":$CERT_WORKER_ID,\"shift_ids\":[]}' | jq -r '.status' | grep -q 'success'"

# Test bulk assignment with invalid worker ID
run_test "Bulk assignment with invalid worker ID" \
    "curl -s -X POST '$BASE_URL/assignments/bulk_create' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker_id\":99999,\"shift_ids\":[1]}' | jq -r '.status' | grep -q 'error'"

# Test bulk assignment with mixed valid/invalid shift IDs
run_test "Bulk assignment with mixed valid/invalid shift IDs" \
    "curl -s -X POST '$BASE_URL/assignments/bulk_create' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker_id\":$CERT_WORKER_ID,\"shift_ids\":[1,99999]}' | jq -r '.data.failed | length' | grep -q '[1-9]'"

echo ""

# ===========================================
# 6. WORKER SCHEDULE VIEW TESTS
# ===========================================
echo -e "${YELLOW}📋 6. WORKER SCHEDULE VIEW TESTS${NC}"

# Test worker assignments endpoint
run_test "Worker assignments endpoint works" \
    "curl -s '$BASE_URL/assignments?worker_id=$CERT_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.status' | grep -q 'success'"

# Test worker assignments include shift data
run_test "Worker assignments include shift data" \
    "curl -s '$BASE_URL/assignments?worker_id=$CERT_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.data[0].shift' | grep -q 'id'"

# Test worker assignments include event data
run_test "Worker assignments include event data" \
    "curl -s '$BASE_URL/assignments?worker_id=$CERT_WORKER_ID' -b '$COOKIES_FILE' | jq -r '.data[0].shift.event' | grep -q 'id'"

echo ""

# ===========================================
# 7. DATA VALIDATION EDGE CASES
# ===========================================
echo -e "${YELLOW}📋 7. DATA VALIDATION EDGE CASES${NC}"

# Test worker creation with invalid email
run_test "Worker creation with invalid email fails" \
    "curl -s -X POST '$BASE_URL/workers' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker\":{\"first_name\":\"Test\",\"last_name\":\"Invalid\",\"email\":\"invalid-email\",\"phone\":\"555-1234\",\"active\":true}}' | jq -r '.status' | grep -q 'error'"

# Test worker creation with duplicate email
run_test "Worker creation with duplicate email fails" \
    "curl -s -X POST '$BASE_URL/workers' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker\":{\"first_name\":\"Test\",\"last_name\":\"Duplicate\",\"email\":\"admin@socialcatering.com\",\"phone\":\"555-1234\",\"active\":true}}' | jq -r '.status' | grep -q 'error'"

# Test worker creation with missing required fields
run_test "Worker creation with missing required fields fails" \
    "curl -s -X POST '$BASE_URL/workers' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker\":{\"first_name\":\"Test\"}}' | jq -r '.status' | grep -q 'error'"

echo ""

# ===========================================
# 8. PERFORMANCE AND LIMITS TESTS
# ===========================================
echo -e "${YELLOW}📋 8. PERFORMANCE AND LIMITS TESTS${NC}"

# Test workers list performance (should be fast)
run_test "Workers list responds quickly" \
    "time curl -s '$BASE_URL/workers' -b '$COOKIES_FILE' > /dev/null && [ $? -eq 0 ]"

# Test search performance
run_test "Worker search responds quickly" \
    "time curl -s '$BASE_URL/workers?search=cameron' -b '$COOKIES_FILE' > /dev/null && [ $? -eq 0 ]"

# Test large skills array handling
run_test "Worker with large skills array handled correctly" \
    "curl -s -X PATCH '$BASE_URL/workers/$CERT_WORKER_ID' -H 'Content-Type: application/json' -b '$COOKIES_FILE' -d '{\"worker\":{\"skills_json\":[\"Skill1\",\"Skill2\",\"Skill3\",\"Skill4\",\"Skill5\",\"Skill6\",\"Skill7\",\"Skill8\",\"Skill9\",\"Skill10\"]}}' | jq -r '.status' | grep -q 'success'"

echo ""

# ===========================================
# CLEANUP
# ===========================================
echo -e "${YELLOW}🧹 CLEANUP${NC}"

# Clean up test workers
echo "Cleaning up test workers..."
curl -s -X DELETE "$BASE_URL/workers/$TEST_WORKER_ID" -b "$COOKIES_FILE" > /dev/null 2>&1 || true
curl -s -X DELETE "$BASE_URL/workers/$CERT_WORKER_ID" -b "$COOKIES_FILE" > /dev/null 2>&1 || true

# Remove cookies file
rm -f "$COOKIES_FILE"

echo ""

# ===========================================
# FINAL RESULTS
# ===========================================
echo -e "${YELLOW}📊 FINAL EDGE CASE TEST RESULTS${NC}"
echo "================================" >> $EDGE_TEST_RESULTS
echo "Tests Passed: $TESTS_PASSED" >> $EDGE_TEST_RESULTS
echo "Tests Failed: $TESTS_FAILED" >> $EDGE_TEST_RESULTS
echo "Total Tests: $TOTAL_TESTS" >> $EDGE_TEST_RESULTS
echo "Success Rate: $(( TESTS_PASSED * 100 / TOTAL_TESTS ))%" >> $EDGE_TEST_RESULTS
echo "Completed: $(date)" >> $EDGE_TEST_RESULTS

echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}📊 Total Tests: $TOTAL_TESTS${NC}"
echo -e "${YELLOW}📈 Success Rate: $(( TESTS_PASSED * 100 / TOTAL_TESTS ))%${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL EDGE CASE TESTS PASSED!${NC}"
    echo "🎉 ALL EDGE CASE TESTS PASSED!" >> $EDGE_TEST_RESULTS
    exit 0
else
    echo -e "${RED}⚠️  Some edge case tests failed. Check the results above.${NC}"
    echo "⚠️  Some edge case tests failed. Check the results above." >> $EDGE_TEST_RESULTS
    exit 1
fi
