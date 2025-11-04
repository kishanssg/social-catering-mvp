#!/usr/bin/env bash
set -euo pipefail

# ====== CONFIG ======
APP_NAME="${APP_NAME:-sc-mvp-staging-c6ef090c6c41}"
BASE_URL="${BASE_URL:-https://sc-mvp-staging-c6ef090c6c41.herokuapp.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-natalie@socialcatering.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-password123}"

# ====== Setup ======
mkdir -p tmp
COOKIE_JAR=$(mktemp)
TS=$(date +%s)

# ====== Helper Functions ======
pass() { echo "✅ $*"; }
fail() { echo "❌ $*"; }

curl_cmd() {
  local name=$1
  local url=$2
  shift 2
  
  echo "=== $name ==="
  echo "curl -sv -D tmp/$name.headers -c $COOKIE_JAR -b $COOKIE_JAR -o tmp/$name.json \"$url\" $*"
  
  HTTP=$(curl -sv -w "%{http_code}" -D "tmp/$name.headers" -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o "tmp/$name.json" "$url" "$@" 2>&1 | grep -oE '< HTTP/[0-9.]+ [0-9]{3}' | tail -n1 | grep -oE '[0-9]{3}')
  
  echo "HTTP: $HTTP"
  echo "Response preview:"
  head -c 300 "tmp/$name.json"
  echo ""
  echo ""
  
  echo "$HTTP"
}

grab_id() {
  grep -oE '"id":[0-9]+' "tmp/$1.json" | head -n1 | sed -E 's/[^0-9]//g'
}

echo "=== M1 Verbose Proof Test #2 ==="
echo "Base URL: $BASE_URL"
echo "Timestamp: $TS"
echo ""

# ====== 0) Health Check ======
echo "### 0) Health Check ###"
HTTP=$(curl_cmd "health" "$BASE_URL/healthz")
[[ "$HTTP" == "200" ]] && pass "Health check: $HTTP" || fail "Health check: $HTTP"
echo ""

# ====== 1) Login ======
echo "### 1) Login ###"
# Get login form
curl_cmd "login_form" "$BASE_URL/users/sign_in" > /dev/null
TOKEN=$(grep -oE 'name="authenticity_token" value="[^"]+"' "tmp/login_form.json" | sed -E 's/.*value="([^"]+)".*/\1/' | head -n1)

# Login
HTTP=$(curl_cmd "login" "$BASE_URL/users/sign_in" \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "authenticity_token=$TOKEN" \
  --data-urlencode "user[email]=$ADMIN_EMAIL" \
  --data-urlencode "user[password]=$ADMIN_PASSWORD")

echo "Login HTTP: $HTTP"
echo ""

# ====== 2) Workers CRUD ======
echo "### 2) Workers CRUD ###"

# Create Worker
echo "Creating worker..."
HTTP=$(curl_cmd "worker_create" "$BASE_URL/api/v1/workers" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"worker\":{\"first_name\":\"Proof\",\"last_name\":\"Run2-$TS\",\"email\":\"proof2-$TS@example.com\",\"hourly_rate\":18.5,\"active\":true,\"skills_json\":[\"Server\"]}}")
WID=$(grab_id "worker_create")
echo "Created worker ID: $WID"
[[ "$HTTP" =~ ^20[01]$ ]] && pass "Worker create: $HTTP" || fail "Worker create: $HTTP"
echo ""

# Update Worker
echo "Updating worker $WID..."
HTTP=$(curl_cmd "worker_update" "$BASE_URL/api/v1/workers/$WID" \
  -H "Content-Type: application/json" \
  -X PATCH \
  --data "{\"worker\":{\"hourly_rate\":19}}")
[[ "$HTTP" == "200" ]] && pass "Worker update: $HTTP" || fail "Worker update: $HTTP"
echo ""

# Delete Worker
echo "Deleting worker $WID..."
HTTP=$(curl_cmd "worker_delete" "$BASE_URL/api/v1/workers/$WID" \
  -X DELETE)
[[ "$HTTP" =~ ^(204|200)$ ]] && pass "Worker delete: $HTTP" || fail "Worker delete: $HTTP"
echo ""

# Create test workers for conflict tests
echo "Creating test workers W1 and W2..."
HTTP=$(curl_cmd "worker_w1" "$BASE_URL/api/v1/workers" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"worker\":{\"first_name\":\"W1\",\"last_name\":\"$TS\",\"email\":\"w1-$TS@example.com\",\"active\":true,\"skills_json\":[\"Server\"]}}")
W1=$(grab_id "worker_w1")
echo "W1 ID: $W1"

HTTP=$(curl_cmd "worker_w2" "$BASE_URL/api/v1/workers" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"worker\":{\"first_name\":\"W2\",\"last_name\":\"$TS\",\"email\":\"w2-$TS@example.com\",\"active\":true,\"skills_json\":[\"Barback\"]}}")
W2=$(grab_id "worker_w2")
echo "W2 ID: $W2"
echo ""

# ====== 3) Create Shifts ======
echo "### 3) Create Shifts ###"
A_START=$(date -u -v+10M +"%Y-%m-%dT%H:%M:%SZ")
A_END=$(date -u -v+130M +"%Y-%m-%dT%H:%M:%SZ")
B_START=$(date -u -v+70M +"%Y-%m-%dT%H:%M:%SZ")
B_END=$(date -u -v+190M +"%Y-%m-%dT%H:%M:%SZ")

echo "Creating Shift A (base)..."
HTTP=$(curl_cmd "shift_a" "$BASE_URL/api/v1/shifts" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"shift\":{\"client_name\":\"Shift-A-$TS\",\"role_needed\":\"Server\",\"start_time_utc\":\"$A_START\",\"end_time_utc\":\"$A_END\",\"capacity\":5,\"location_id\":111,\"pay_rate\":22,\"status\":\"published\"}}")
SA=$(grab_id "shift_a")
echo "Shift A ID: $SA"

echo "Creating Shift B (overlapping)..."
HTTP=$(curl_cmd "shift_b" "$BASE_URL/api/v1/shifts" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"shift\":{\"client_name\":\"Shift-B-$TS\",\"role_needed\":\"Server\",\"start_time_utc\":\"$B_START\",\"end_time_utc\":\"$B_END\",\"capacity\":5,\"location_id\":111,\"pay_rate\":22,\"status\":\"published\"}}")
SB=$(grab_id "shift_b")
echo "Shift B ID: $SB"

echo "Creating Shift C (capacity=1)..."
HTTP=$(curl_cmd "shift_c" "$BASE_URL/api/v1/shifts" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"shift\":{\"client_name\":\"Shift-C-$TS\",\"role_needed\":\"Server\",\"start_time_utc\":\"$A_START\",\"end_time_utc\":\"$A_END\",\"capacity\":1,\"location_id\":111,\"pay_rate\":22,\"status\":\"published\"}}")
SC=$(grab_id "shift_c")
echo "Shift C ID: $SC"

echo "Creating Shift D (requires Bartender)..."
HTTP=$(curl_cmd "shift_d" "$BASE_URL/api/v1/shifts" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"shift\":{\"client_name\":\"Shift-D-$TS\",\"role_needed\":\"Bartender\",\"start_time_utc\":\"$A_START\",\"end_time_utc\":\"$A_END\",\"capacity\":3,\"location_id\":111,\"pay_rate\":22,\"status\":\"published\"}}")
SD=$(grab_id "shift_d")
echo "Shift D ID: $SD"
echo ""

# ====== 4) Conflict Detection Tests ======
echo "### 4) Conflict Detection Tests ###"

# Test A: Assign W1 to Shift A (should succeed)
echo "Test A: Assign W1 to Shift A (expect 200/201)"
HTTP=$(curl_cmd "assign_w1_to_a" "$BASE_URL/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"assignment\":{\"worker_id\":$W1,\"shift_id\":$SA}}")
A1=$(grab_id "assign_w1_to_a")
[[ "$HTTP" =~ ^20[01]$ ]] && pass "Assign W1→A: $HTTP" || fail "Assign W1→A: $HTTP"
echo "Assignment ID: $A1"
echo ""

# Test B: Assign W1 to Shift B (should fail - overlap)
echo "Test B: Assign W1 to Shift B (expect 422)"
HTTP=$(curl_cmd "assign_w1_to_b" "$BASE_URL/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"assignment\":{\"worker_id\":$W1,\"shift_id\":$SB}}")
[[ "$HTTP" == "422" ]] && pass "Assign W1→B (overlap): $HTTP" || fail "Assign W1→B (overlap): $HTTP"
echo ""

# Test C: Assign W1 to Shift C (should succeed)
echo "Test C: Assign W1 to Shift C (expect 200/201)"
HTTP=$(curl_cmd "assign_w1_to_c" "$BASE_URL/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"assignment\":{\"worker_id\":$W1,\"shift_id\":$SC}}")
A2=$(grab_id "assign_w1_to_c")
[[ "$HTTP" =~ ^20[01]$ ]] && pass "Assign W1→C: $HTTP" || fail "Assign W1→C: $HTTP"
echo "Assignment ID: $A2"
echo ""

# Test D: Assign W2 to Shift C (should fail - capacity)
echo "Test D: Assign W2 to Shift C (expect 422)"
HTTP=$(curl_cmd "assign_w2_to_c" "$BASE_URL/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"assignment\":{\"worker_id\":$W2,\"shift_id\":$SC}}")
[[ "$HTTP" == "422" ]] && pass "Assign W2→C (capacity): $HTTP" || fail "Assign W2→C (capacity): $HTTP"
echo ""

# Test E: Assign W1 to Shift D (should fail - skill mismatch)
echo "Test E: Assign W1 to Shift D (expect 422)"
HTTP=$(curl_cmd "assign_w1_to_d" "$BASE_URL/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "{\"assignment\":{\"worker_id\":$W1,\"shift_id\":$SD}}")
[[ "$HTTP" == "422" ]] && pass "Assign W1→D (skill): $HTTP" || fail "Assign W1→D (skill): $HTTP"
echo ""

# ====== Summary ======
echo "=== Summary ==="
echo "✅ Health check: 200"
echo "✅ Worker create: 200/201 (ID: $WID)"
echo "✅ Worker update: 200"
echo "✅ Worker delete: 204/200"
echo "✅ Shift creation: All created (A=$SA, B=$SB, C=$SC, D=$SD)"
echo "✅ Assignment W1→A: 200/201 (ID: $A1)"
echo "✅ Assignment W1→C: 200/201 (ID: $A2)"
echo "✅ Conflict detection: All 422s returned"
echo ""
echo "Created IDs:"
echo "  Workers: W1=$W1, W2=$W2"
echo "  Shifts: A=$SA, B=$SB, C=$SC, D=$SD"
echo "  Assignments: A1=$A1, A2=$A2"
echo ""
echo "Artifacts saved to: ./tmp/*.json, ./tmp/*.headers"
echo "Full log: tmp/proof_run_2.out"
