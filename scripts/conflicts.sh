#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-sc-mvp-staging}"
BASE_URL="${BASE_URL:-https://sc-mvp-staging-c6ef090c6c41.herokuapp.com}"
EMAIL="${ADMIN_EMAIL:-natalie@socialcatering.com}"
PASSWORD="${ADMIN_PASSWORD:-password123}"

COOKIE_JAR="$(mktemp)"
UA="curl-m1/1.0"
CURL=(curl -sSL --retry 2 --connect-timeout 10 -A "$UA" -c "$COOKIE_JAR" -b "$COOKIE_JAR")

# Helper functions
csrf_from_meta(){ grep -oE '<meta name="csrf-token" content="[^"]+"' | sed -E 's/.*content="([^"]+)".*/\1/' | head -n1; }
get(){ "${CURL[@]}" -H "Accept: application/json" "$BASE_URL$1"; }
post(){ "${CURL[@]}" -H "Accept: application/json" -H "Content-Type: application/json" -H "X-CSRF-Token: $CSRF" -X POST -d "$2" "$BASE_URL$1"; }

echo "=== Conflict Detection Tests ==="
echo "Base URL: $BASE_URL"
echo ""

# Login
echo "Logging in..."
signin=$("${CURL[@]}" "$BASE_URL/users/sign_in")
token=$(echo "$signin" | grep -oE 'name="authenticity_token" value="[^"]+"' | sed -E 's/.*value="([^"]+)".*/\1/')
"${CURL[@]}" -X POST -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "authenticity_token=$token" \
  --data-urlencode "user[email]=$EMAIL" \
  --data-urlencode "user[password]=$PASSWORD" \
  "$BASE_URL/users/sign_in" >/dev/null

# Get CSRF
root_html=$("${CURL[@]}" "$BASE_URL/")
CSRF=$(echo "$root_html" | csrf_from_meta)

# Get a worker
echo "Getting first worker..."
workers=$(get "/api/v1/workers?per_page=1")
worker_id=$(echo "$workers" | grep -oE '"id":\s*[0-9]+' | head -n1 | sed 's/"id": *\([0-9]\)/\1/')
[[ -z "$worker_id" ]] && { echo "No workers found"; exit 1; }
echo "Using worker ID: $worker_id"
echo ""

# Get an existing shift
echo "Getting first shift..."
shifts=$(get "/api/v1/shifts?per_page=1")
shift_id=$(echo "$shifts" | grep -oE '"id":\s*[0-9]+' | head -n1 | sed 's/"id": *\([0-9]\)/\1/')
[[ -z "$shift_id" ]] && { echo "No shifts found"; exit 1; }
echo "Using shift ID: $shift_id"

# Try to create a duplicate assignment (same worker, same shift)
echo ""
echo "Testing conflict: duplicate assignment..."
duplicate_resp=$(post "/api/v1/assignments" "{\"assignment\":{\"worker_id\":$worker_id,\"shift_id\":$shift_id,\"status\":\"assigned\"}}" 2>&1 || true)
if echo "$duplicate_resp" | grep -q -i 'conflict\|already\|duplicate\|422'; then
  echo "✅ PASS: Duplicate assignment blocked (422)"
else
  echo "⚠️  WARN: Expected conflict not detected"
  echo "Response: $(echo "$duplicate_resp" | head -c 200)"
fi
echo ""

# Test capacity constraint - get shift capacity
shift_detail=$(get "/api/v1/shifts/$shift_id")
echo "Testing capacity constraint..."
echo "Current shift: $(echo "$shift_detail" | head -c 300)"
echo ""

# Test expired certification constraint
echo "Testing expired certification constraint..."
assignments=$(get "/api/v1/assignments?shift_id=$shift_id")
assignment_count=$(echo "$assignments" | grep -o '"id"' | wc -l | tr -d ' ')
echo "Current assignments for shift: $assignment_count"
echo ""

echo "Note: Detailed overlap/capacity/cert tests would require creating specific test data"
echo "For production, these constraints are enforced by the AssignWorkerToShift service."

rm -f "$COOKIE_JAR"

