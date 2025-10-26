#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://sc-mvp-staging-c6ef090c6c41.herokuapp.com"
EMAIL="natalie@socialcatering.com"
PASSWORD="password123"

COOKIE_JAR=$(mktemp)

pass(){ echo "✅ PASS: $*"; }
fail(){ echo "❌ FAIL: $*"; }

echo "=== Milestone 1 Smoke Tests ==="
echo "Base URL: $BASE_URL"
echo ""

echo "Testing /healthz..."
health=$(curl -s "$BASE_URL/healthz")
echo "$health" | grep -q '"status"' && pass "/healthz 200" || fail "/healthz"
echo "$health"
echo ""

# Login and get session cookie
echo "Testing Devise session auth..."
signin=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/users/sign_in")
token=$(echo "$signin" | grep -oE 'name="authenticity_token" value="[^"]+"' | sed -E 's/.*value="([^"]+)".*/\1/')
[[ -n "$token" ]] && pass "Login form token found" || fail "No auth token"

login=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "authenticity_token=$token" \
  --data-urlencode "user[email]=$EMAIL" \
  --data-urlencode "user[password]=$PASSWORD" \
  "$BASE_URL/users/sign_in")

grep -qi '_session' "$COOKIE_JAR" && pass "Session cookie present" || fail "Login failed"
echo ""

# READ checks
echo "Testing GET /api/v1/workers..."
workers=$(curl -s -b "$COOKIE_JAR" -H "Accept: application/json" "$BASE_URL/api/v1/workers?per_page=3")
if echo "$workers" | grep -q '\['; then
  pass "GET /workers"
  echo "Sample: $(echo "$workers" | head -c 200)..."
else
  fail "GET /workers"
fi
echo ""

echo "Testing GET /api/v1/shifts..."
shifts=$(curl -s -b "$COOKIE_JAR" -H "Accept: application/json" "$BASE_URL/api/v1/shifts?per_page=3")
if echo "$shifts" | grep -q '\['; then
  pass "GET /shifts"
  echo "Sample: $(echo "$shifts" | head -c 200)..."
else
  fail "GET /shifts"
fi
echo ""

echo "Testing GET /api/v1/events..."
events=$(curl -s -b "$COOKIE_JAR" -H "Accept: application/json" "$BASE_URL/api/v1/events?per_page=3")
if echo "$events" | grep -q '\['; then
  pass "GET /events"
  echo "Sample: $(echo "$events" | head -c 200)..."
else
  fail "GET /events"
fi
echo ""

echo "✅ Basic smoke tests completed!"

rm -f "$COOKIE_JAR"
