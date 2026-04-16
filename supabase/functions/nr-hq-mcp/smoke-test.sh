#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# nr-hq-mcp smoke test — Memory Library Task 3
# ─────────────────────────────────────────────────────────────────────────────
# 14 curl calls against the deployed nr-hq-mcp endpoint:
#   - 2 baseline reads (confirms existing tools still work)
#   - 12 new write/CRUD tools
#
# USAGE:
#   export MCP_ACCESS_KEY='<paste-from-1Password>'
#   bash supabase/functions/nr-hq-mcp/smoke-test.sh
#
# DEPENDENCIES:
#   - curl
#   - grep, sed (standard POSIX — no jq required)
#
# TEST DATA:
#   - Open item:  title="SMOKE TEST — DELETE ME" (category=task, priority=low)
#   - Client:     name="SMOKE TEST CLIENT" (status=queued) — identified by uuid
#   - Build Tracker: no-op restores (writes current values back)
#
# CLEANUP (run in Supabase SQL Editor after all 14 tests pass):
#
#   delete from public.open_items where title = 'SMOKE TEST — DELETE ME';
#   delete from public.neon_rabbit_clients where name = 'SMOKE TEST CLIENT';
#
# ─────────────────────────────────────────────────────────────────────────────
set -u

: "${MCP_ACCESS_KEY:?MCP_ACCESS_KEY env var must be set — pull from 1Password and export}"
ENDPOINT="https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/nr-hq-mcp?key=${MCP_ACCESS_KEY}"

PASS=0
FAIL=0
FAIL_NAMES=()
CREATED_OPEN_ITEM_ID=""
CREATED_CLIENT_ID=""

# ─── helpers ─────────────────────────────────────────────────────────────────

# Call a tool. $1 = label, $2 = tool name, $3 = arguments JSON.
# Prints PASS/FAIL. Stores raw response in $LAST_BODY.
LAST_BODY=""
call_tool() {
  local label="$1" tool="$2" args="$3"
  local body http_code response
  body=$(printf '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"%s","arguments":%s}}' \
    "$tool" "$args")

  response=$(curl -s -w "\n__HTTP__%{http_code}" -X POST "$ENDPOINT" \
    -H "Accept: application/json, text/event-stream" \
    -H "Content-Type: application/json" \
    -d "$body")

  http_code=$(echo "$response" | tail -n1 | sed 's/^__HTTP__//')
  LAST_BODY=$(echo "$response" | sed '$d')

  local is_error=0
  if echo "$LAST_BODY" | grep -q '"isError":[[:space:]]*true'; then is_error=1; fi
  if echo "$LAST_BODY" | grep -q '"error":[[:space:]]*{'; then is_error=1; fi

  if [[ "$http_code" == "200" && $is_error -eq 0 ]]; then
    echo "✅ PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL  $label  (http=$http_code)"
    echo "   body: $LAST_BODY"
    FAIL=$((FAIL + 1))
    FAIL_NAMES+=("$label")
  fi
}

# Grab the first UUID appearing in the last response.
# For create_* tools, this is the id of the just-created row.
extract_first_uuid() {
  echo "$LAST_BODY" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1
}

# ─────────────────────────────────────────────────────────────────────────────
# Baseline reads (2)
# ─────────────────────────────────────────────────────────────────────────────

echo "─── Baseline reads ───────────────────────────────────────────────────"

call_tool "01  get_build_summary"   "get_build_summary"   '{}'
call_tool "02  get_phases"          "get_phases"          '{"limit":5}'

# ─────────────────────────────────────────────────────────────────────────────
# Open Items CRUD (create → update → resolve → get)
# ─────────────────────────────────────────────────────────────────────────────

echo "─── Open Items CRUD ──────────────────────────────────────────────────"

call_tool "03  create_open_item"    "create_open_item" \
  '{"title":"SMOKE TEST — DELETE ME","category":"task","priority":"low","description":"initial"}'

CREATED_OPEN_ITEM_ID=$(extract_first_uuid)
if [[ -z "$CREATED_OPEN_ITEM_ID" ]]; then
  echo "⚠  Could not extract created open_item id — update/resolve tests will be skipped."
  echo "❌ FAIL  04  update_open_item  (no id captured)"; FAIL=$((FAIL+1)); FAIL_NAMES+=("04")
  echo "❌ FAIL  05  resolve_open_item (no id captured)"; FAIL=$((FAIL+1)); FAIL_NAMES+=("05")
else
  echo "   → captured open_item id: $CREATED_OPEN_ITEM_ID"

  call_tool "04  update_open_item"    "update_open_item" \
    "$(printf '{"id":"%s","description":"updated by smoke test"}' "$CREATED_OPEN_ITEM_ID")"

  call_tool "05  resolve_open_item"   "resolve_open_item" \
    "$(printf '{"id":"%s","resolution":"smoke test cleanup"}' "$CREATED_OPEN_ITEM_ID")"
fi

call_tool "06  get_open_items"      "get_open_items" \
  '{"status":"resolved"}'

# ─────────────────────────────────────────────────────────────────────────────
# Clients CRUD (create → update → get → get_clients)
# Schema (per Decision 10): id (uuid) is the unique key. No `code` column.
# Writable: name, site_name, site_url, status, tier, mrr, started_at,
#           launched_at, notes, user_id.
# No updated_at column exists.
# ─────────────────────────────────────────────────────────────────────────────

echo "─── Clients CRUD ─────────────────────────────────────────────────────"

# user_id is NOT NULL at DB level — reuse the existing owner uuid visible on every
# live row in get_clients. If that uuid changes, update here.
SMOKE_CLIENT_USER_ID="40ddb0a2-6de7-494b-b0b6-22cbfc41fd36"
call_tool "07  create_client"       "create_client" \
  "$(printf '{"name":"SMOKE TEST CLIENT","user_id":"%s","status":"queued","notes":"smoke test row"}' "$SMOKE_CLIENT_USER_ID")"

CREATED_CLIENT_ID=$(extract_first_uuid)
if [[ -z "$CREATED_CLIENT_ID" ]]; then
  echo "⚠  Could not extract created client id — update/get tests will be skipped."
  echo "❌ FAIL  08  update_client  (no id captured)"; FAIL=$((FAIL+1)); FAIL_NAMES+=("08")
  echo "❌ FAIL  09  get_client     (no id captured)"; FAIL=$((FAIL+1)); FAIL_NAMES+=("09")
else
  echo "   → captured client id: $CREATED_CLIENT_ID"

  call_tool "08  update_client"     "update_client" \
    "$(printf '{"id":"%s","notes":"updated smoke note","mrr":49}' "$CREATED_CLIENT_ID")"

  call_tool "09  get_client"        "get_client" \
    "$(printf '{"id":"%s"}' "$CREATED_CLIENT_ID")"
fi

call_tool "10  get_clients"         "get_clients" \
  '{"status":"queued"}'

# ─────────────────────────────────────────────────────────────────────────────
# Build Tracker (real data, no-op restores)
# ─────────────────────────────────────────────────────────────────────────────

echo "─── Build Tracker (no-op restores) ───────────────────────────────────"

# update_task_status — target phase_0 task_0.1 (real task known to exist in sparkle_suite).
# Use status='complete' no-op; if the real task is already complete this is a pure no-op.
call_tool "11  update_task_status"  "update_task_status" \
  '{"task_key":"task_0_1","status":"complete","notes":"smoke: no-op restore"}'

# update_phase_status — no-op phase_0 → in_progress (or use current value). This also
# triggers the count recompute.
call_tool "12  update_phase_status" "update_phase_status" \
  '{"phase_key":"phase_0","status":"in_progress"}'

# update_gate_status — no-op gate_0 → locked (or current value).
call_tool "13  update_gate_status"  "update_gate_status" \
  '{"gate_key":"gate_0","status":"locked"}'

# update_action_cards — write back placeholder cards. After smoke test, Louis should
# either read the 3 cards before running this script (and put them in the JSON below)
# or run update_action_cards manually from Claude Chat to restore real content.
call_tool "14  update_action_cards" "update_action_cards" \
  '{"previous":{"title":"SMOKE PREVIOUS","description":"replace me"},"current":{"title":"SMOKE CURRENT","description":"replace me"},"next":{"title":"SMOKE NEXT","description":"replace me"}}'

echo
echo "⚠  NOTE: update_action_cards writes 3 placeholder cards. Restore real"
echo "    cards via Claude Chat (update_action_cards) or SQL after smoke test."

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────

echo
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Results: ${PASS} PASS   ${FAIL} FAIL"
if [[ $FAIL -gt 0 ]]; then
  echo "  Failed: ${FAIL_NAMES[*]}"
fi
echo "═══════════════════════════════════════════════════════════════════════"
echo
echo "CLEANUP (Supabase SQL Editor):"
echo "  delete from public.open_items where title = 'SMOKE TEST — DELETE ME';"
echo "  delete from public.neon_rabbit_clients where name = 'SMOKE TEST CLIENT';"
echo

exit $FAIL
