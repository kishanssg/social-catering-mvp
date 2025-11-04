#!/usr/bin/env bash
set -euo pipefail

# M1 Complete Verification Script
# Tests all acceptance criteria on Heroku staging

APP_NAME="${APP_NAME:-sc-mvp-staging}"
BASE_URL="${BASE_URL:-https://sc-mvp-staging-c6ef090c6c41.herokuapp.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-natalie@socialcatering.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-password123}"

echo "=========================================="
echo "MILESTONE 1 COMPLETE VERIFICATION"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Date: $(date)"
echo ""

# Create output directory
mkdir -p tmp/m1_verification

# Test counter
PASSED=0
FAILED=0

test_pass() {
  echo "✅ PASS: $1"
  ((PASSED++))
}

test_fail() {
  echo "❌ FAIL: $1"
  ((FAILED++))
}

# ========== 1. Health Check ==========
echo "1. Testing /healthz endpoint..."
HTTP=$(curl -s -o tmp/m1_verification/health.json -w "%{http_code}" "$BASE_URL/healthz")
if [ "$HTTP" = "200" ]; then
  test_pass "/healthz returns 200"
  HEALTH_STATUS=$(cat tmp/m1_verification/health.json | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  if [ "$HEALTH_STATUS" = "healthy" ]; then
    test_pass "/healthz status is 'healthy'"
  else
    test_fail "/healthz status is not 'healthy' (got: $HEALTH_STATUS)"
  fi
else
  test_fail "/healthz returned HTTP $HTTP (expected 200)"
fi
echo ""

# ========== 2. Database Schema ==========
echo "2. Verifying PostgreSQL schema..."
TABLE_COUNT=$(heroku pg:info -a "$APP_NAME" 2>/dev/null | grep -E "Tables:" | grep -oE '[0-9]+' | head -1 || echo "0")
if [ "$TABLE_COUNT" -ge 19 ]; then
  test_pass "Database has at least 19 tables (found: $TABLE_COUNT)"
else
  test_fail "Database has fewer than 19 tables (found: $TABLE_COUNT)"
fi
echo ""

# ========== 3. Devise Authentication ==========
echo "3. Testing Devise authentication..."
COOKIE_JAR="tmp/m1_verification/cookies.txt"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"user\":{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}}" \
  "$BASE_URL/api/v1/login" | tee tmp/m1_verification/login_response.json)

if echo "$LOGIN_RESPONSE" | grep -q '"status":"success"'; then
  test_pass "Devise login successful"
  if grep -q "$ADMIN_EMAIL" tmp/m1_verification/login_response.json; then
    test_pass "Admin email verified in response"
  else
    test_fail "Admin email not found in response"
  fi
else
  test_fail "Devise login failed"
fi
echo ""

# ========== 4. Workers CRUD ==========
echo "4. Testing Workers CRUD operations..."

# CREATE
TIMESTAMP=$(date +%s)
CREATE_RESPONSE=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"worker\":{\"first_name\":\"Test\",\"last_name\":\"Worker-$TIMESTAMP\",\"email\":\"test-$TIMESTAMP@example.com\",\"hourly_rate\":18.5,\"active\":true,\"skills_json\":[\"Server\"]}}" \
  "$BASE_URL/api/v1/workers" | tee tmp/m1_verification/worker_create.json)

if echo "$CREATE_RESPONSE" | grep -q '"status":"success"'; then
  test_pass "Worker CREATE successful"
  WORKER_ID=$(echo "$CREATE_RESPONSE" | grep -oE '"id":[0-9]+' | head -1 | grep -oE '[0-9]+')
  
  if [ -n "$WORKER_ID" ]; then
    # UPDATE
    UPDATE_RESPONSE=$(curl -s -b "$COOKIE_JAR" \
      -H "Content-Type: application/json" \
      -X PATCH \
      --data "{\"worker\":{\"hourly_rate\":19.5}}" \
      "$BASE_URL/api/v1/workers/$WORKER_ID" | tee tmp/m1_verification/worker_update.json)
    
    if echo "$UPDATE_RESPONSE" | grep -q '"hourly_rate":"19.5"'; then
      test_pass "Worker UPDATE successful"
    else
      test_fail "Worker UPDATE failed (hourly_rate not updated)"
    fi
    
    # DELETE
    DELETE_HTTP=$(curl -s -b "$COOKIE_JAR" \
      -X DELETE \
      -w "%{http_code}" \
      -o tmp/m1_verification/worker_delete.json \
      "$BASE_URL/api/v1/workers/$WORKER_ID")
    
    if [ "$DELETE_HTTP" = "200" ] || [ "$DELETE_HTTP" = "204" ]; then
      test_pass "Worker DELETE successful (HTTP $DELETE_HTTP)"
    else
      test_fail "Worker DELETE failed (HTTP $DELETE_HTTP)"
    fi
  else
    test_fail "Could not extract Worker ID from CREATE response"
  fi
else
  test_fail "Worker CREATE failed"
fi
echo ""

# ========== 5. Conflict Detection ==========
echo "5. Testing assignment conflict detection..."

# Create two workers
W1_RESPONSE=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"worker\":{\"first_name\":\"Worker\",\"last_name\":\"One-$TIMESTAMP\",\"email\":\"w1-$TIMESTAMP@example.com\",\"active\":true,\"skills_json\":[\"Server\"]}}" \
  "$BASE_URL/api/v1/workers")

W1_ID=$(echo "$W1_RESPONSE" | grep -oE '"id":[0-9]+' | head -1 | grep -oE '[0-9]+')

# Create two overlapping shifts
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ" | sed 's/00:00/14:00/')  # 2pm today UTC
START1="$NOW"
END1=$(date -u -v+2H +"%Y-%m-%dT%H:%M:%SZ" | sed 's/00:00/16:00/' || date -u +"%Y-%m-%dT%H:%M:%SZ")
START2=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" | sed 's/00:00/15:00/' || date -u +"%Y-%m-%dT%H:%M:%SZ")
END2=$(date -u -v+3H +"%Y-%m-%dT%H:%M:%SZ" | sed 's/00:00/17:00/' || date -u +"%Y-%m-%dT%H:%M:%SZ")

S1_RESPONSE=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"shift\":{\"client_name\":\"Test-Shift-1-$TIMESTAMP\",\"role_needed\":\"Server\",\"start_time_utc\":\"$START1\",\"end_time_utc\":\"$END1\",\"capacity\":2,\"location_id\":1,\"pay_rate\":22,\"status\":\"published\"}}" \
  "$BASE_URL/api/v1/shifts")

S1_ID=$(echo "$S1_RESPONSE" | grep -oE '"id":[0-9]+' | head -1 | grep -oE '[0-9]+')

# Assign worker to first shift
ASSIGN1=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"assignment\":{\"worker_id\":$W1_ID,\"shift_id\":$S1_ID}}" \
  "$BASE_URL/api/v1/assignments" | tee tmp/m1_verification/assign1.json)

if echo "$ASSIGN1" | grep -q '"status":"success"'; then
  test_pass "Initial assignment successful"
  
  # Create overlapping shift
  S2_RESPONSE=$(curl -s -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -X POST \
    --data "{\"shift\":{\"client_name\":\"Test-Shift-2-$TIMESTAMP\",\"role_needed\":\"Server\",\"start_time_utc\":\"$START2\",\"end_time_utc\":\"$END2\",\"capacity\":2,\"location_id\":1,\"pay_rate\":22,\"status\":\"published\"}}" \
    "$BASE_URL/api/v1/shifts")
  
  S2_ID=$(echo "$S2_RESPONSE" | grep -oE '"id":[0-9]+' | head -1 | grep -oE '[0-9]+')
  
  # Try to assign same worker to overlapping shift (should fail)
  ASSIGN2=$(curl -s -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -X POST \
    --data "{\"assignment\":{\"worker_id\":$W1_ID,\"shift_id\":$S2_ID}}" \
    "$BASE_URL/api/v1/assignments" | tee tmp/m1_verification/assign_overlap.json)
  
  if echo "$ASSIGN2" | grep -q '"status":"error"' && echo "$ASSIGN2" | grep -q 'conflicting'; then
    test_pass "Time overlap detection working (422 error)"
  else
    test_fail "Time overlap detection not working"
  fi
else
  test_fail "Initial assignment failed"
fi
echo ""

# ========== Summary ==========
echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED"
  echo "MILESTONE 1: COMPLETE AND VERIFIED"
  exit 0
else
  echo "⚠️  SOME TESTS FAILED"
  echo "Review output in tmp/m1_verification/"
  exit 1
fi

