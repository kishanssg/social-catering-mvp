#!/usr/bin/env bash
set -euo pipefail

# ====== CONFIG (edit these 4) ======
APP_NAME="${APP_NAME:-sc-mvp-staging-c6ef090c6c41}"
BASE_URL="${BASE_URL:-https://sc-mvp-staging-c6ef090c6c41.herokuapp.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-natalie@socialcatering.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-password123}"

# ====== helpers ======
COOKIE_JAR="$(mktemp)"
UA="m1-proof/1.0"

curlx() {  # curl + capture status code in $HTTP
  HTTP=$(curl -sS -w "%{http_code}" -o "$2" -A "$UA" -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$1" "${@:3}")
}
grab_id()   { grep -oE '"id":[0-9]+' | head -n1 | sed -E 's/[^0-9]//g'; }
pass(){ echo "✅ $*"; }
fail(){ echo "❌ $*"; exit 1; }

# ====== 0) health ======
mkdir -p tmp
curlx "$BASE_URL/healthz" tmp/health.json
[[ "$HTTP" == "200" ]] || fail "/healthz HTTP $HTTP"
pass "/healthz 200"; head -c 120 tmp/health.json; echo; echo

# ====== 1) login (API sessions) ======
curlx "$BASE_URL/api/v1/login" tmp/login.json -H "Content-Type: application/json" -X POST --data "{\"user\":{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}}"
[[ "$HTTP" == "200" ]] || fail "API login HTTP $HTTP"
grep -qi '_session' "$COOKIE_JAR" && pass "Logged in; session cookie present" || fail "Login failed"

# ====== 2) workers CRUD smoke ======
TS=$(date +%s)
BODY_CREATE=$(cat <<JSON
{"worker":{"first_name":"Proof","last_name":"Run-$TS","email":"proof-$TS@example.com","hourly_rate":18.5,"active":true,"skills_json":["Server"]}}
JSON
)
curlx "$BASE_URL/api/v1/workers" tmp/wcreate.json -H "Content-Type: application/json" -X POST --data "$BODY_CREATE"
[[ "$HTTP" == "201" || "$HTTP" == "200" ]] || fail "Create worker HTTP $HTTP"
WID=$(grab_id < tmp/wcreate.json); [[ -n "$WID" ]] || fail "No worker id"
pass "Create worker → $WID"

curlx "$BASE_URL/api/v1/workers/$WID" tmp/wupd.json -H "Content-Type: application/json" -X PATCH --data '{"worker":{"hourly_rate":19}}'
[[ "$HTTP" == "200" ]] || fail "Update worker HTTP $HTTP"
grep -q '"hourly_rate":"19.0"' tmp/wupd.json && pass "Update worker hourly_rate=19" || fail "Update body mismatch"

curlx "$BASE_URL/api/v1/workers/$WID" tmp/wdel.out -X DELETE
[[ "$HTTP" == "204" || "$HTTP" == "200" ]] && pass "Delete worker $WID" || fail "Delete worker HTTP $HTTP"

# Two workers for assignment tests
create_worker() {
  local label=$1 skills=$2 out=tmp/"$1".json
  curlx "$BASE_URL/api/v1/workers" "$out" -H "Content-Type: application/json" -X POST --data "{\"worker\":{\"first_name\":\"$label\",\"last_name\":\"$TS\",\"email\":\"$label-$TS@example.com\",\"active\":true,\"skills_json\":$skills}}"
  [[ "$HTTP" == "201" || "$HTTP" == "200" ]] || fail "Create $label worker HTTP $HTTP"
  grab_id < "$out"
}
W1=$(create_worker W1 '["Server"]')
W2=$(create_worker W2 '["Barback"]')
pass "Prepared workers: W1=$W1 (Server), W2=$W2 (Barback)"

# ====== shift helpers ======
mk_shift() {
  local label="${1:-unknown}" start="$2" end="$3" cap="$4" reqSkill="$5" out=tmp/"$label".json
  local payload
  local ts=$(date +%s)
  if [[ -n "$reqSkill" ]]; then
    payload="{\"shift\":{\"client_name\":\"$label-$ts\",\"role_needed\":\"$reqSkill\",\"required_skill\":\"$reqSkill\",\"start_time_utc\":\"$start\",\"end_time_utc\":\"$end\",\"capacity\":$cap,\"location\":111,\"pay_rate\":22,\"status\":\"published\"}}"
  else
    payload="{\"shift\":{\"client_name\":\"$label-$ts\",\"role_needed\":\"Server\",\"start_time_utc\":\"$start\",\"end_time_utc\":\"$end\",\"capacity\":$cap,\"location\":111,\"pay_rate\":22,\"status\":\"published\"}}"
  fi
  curlx "$BASE_URL/api/v1/shifts" "$out" -H "Content-Type: application/json" -X POST --data "$payload"
  [[ "$HTTP" == "201" || "$HTTP" == "200" ]] || fail "Create shift $label HTTP $HTTP"
  grab_id < "$out"
}
assign() {
  local wid=$1 sid=$2 out=tmp/assign_${wid}_$sid.json
  curlx "$BASE_URL/api/v1/assignments" "$out" -H "Content-Type: application/json" -X POST --data "{\"assignment\":{\"worker_id\":$wid,\"shift_id\":$sid}}"
  echo "$HTTP"
}
now(){ date -u -v+10M +"%Y-%m-%dT%H:%M:%SZ"; }
now_plus(){ date -u -v+$1 +"%Y-%m-%dT%H:%M:%SZ"; }

A_START=$(now_plus "10M");  A_END=$(now_plus "130M")
B_START=$(now_plus "70M");  B_END=$(now_plus "190M")

# ====== PROOF 1 — No double-booking (expect 422) ======
S_A=$(mk_shift "A_overlap_base" "$A_START" "$A_END" 5 "")
code=$(assign "$W1" "$S_A"); [[ "$code" =~ ^20[01]$ ]] || fail "Assign W1→S_A HTTP $code"
S_B=$(mk_shift "B_overlap_conflict" "$B_START" "$B_END" 5 "")
code=$(assign "$W1" "$S_B"); [[ "$code" == "422" ]] && pass "Overlap returns 422" || fail "Expected 422 for overlap, got $code"

# ====== PROOF 2 — Capacity limit (expect 422) ======
S_C=$(mk_shift "C_capacity_one" "$A_START" "$A_END" 1 "")
code=$(assign "$W1" "$S_C"); [[ "$code" =~ ^20[01]$ ]] || fail "Assign W1→S_C HTTP $code"
code=$(assign "$W2" "$S_C"); [[ "$code" == "422" ]] && pass "Capacity returns 422" || fail "Expected 422 for capacity, got $code"

# ====== PROOF 3 — Required skill (expect 422) ======
S_D=$(mk_shift "D_skill_required" "$A_START" "$A_END" 3 "Bartender")
code=$(assign "$W1" "$S_D"); [[ "$code" == "422" ]] && pass "Required skill returns 422" || fail "Expected 422 for skill, got $code"

echo
pass "All three proofs collected."
echo "Artifacts in ./tmp (health.json, wcreate.json, *_overlap_*.json, *_capacity_*.json, *_skill_*.json, assign_*.json)"
