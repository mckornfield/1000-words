#!/usr/bin/env bash
# Runs all automated quality checks and outputs a structured results table.
# Matches the same check order as CI (.github/workflows/ci.yml).
# Exit code: 0 if all pass, 1 if any fail.
#
# Supabase policy:
# - REVIEW_SUPABASE=auto   (default): require Supabase checks locally; fail if
#   prerequisites are unavailable or checks fail.
# - REVIEW_SUPABASE=strict: same as auto (kept for explicitness/CI parity).
# - REVIEW_SUPABASE=off: skip Supabase checks with an explicit warning row.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS="pass"
FAIL="fail"
WARN="warn"
any_failed=0

declare -a NAMES=()
declare -a STATUSES=()
declare -a DETAILS=()

run_check() {
  local name="$1"
  shift
  local output
  if output=$(eval "$*" 2>&1); then
    NAMES+=("$name")
    STATUSES+=("$PASS")
    # Last non-empty line as detail
    local detail
    detail=$(echo "$output" | grep -v '^[[:space:]]*$' | tail -1 | cut -c1-80)
    DETAILS+=("${detail:-ok}")
  else
    NAMES+=("$name")
    STATUSES+=("$FAIL")
    any_failed=1
    # First meaningful error line
    local detail
    detail=$(echo "$output" | grep -iE 'error|failed|ERR' | head -1 | cut -c1-80)
    detail="${detail:-$(echo "$output" | grep -v '^[[:space:]]*$' | tail -1 | cut -c1-80)}"
    DETAILS+=("${detail:-unknown error}")
  fi
}

add_result() {
  local name="$1"
  local status="$2"
  local detail="$3"
  NAMES+=("$name")
  STATUSES+=("$status")
  DETAILS+=("$detail")
  [[ "$status" == "$FAIL" ]] && any_failed=1
}

run_supabase_checks() {
  local mode="${REVIEW_SUPABASE:-auto}"
  local setup_env_file="/tmp/supabase-review.env"

  if [[ "$mode" != "auto" && "$mode" != "strict" && "$mode" != "off" ]]; then
    add_result "supabase-checks" "$FAIL" "invalid REVIEW_SUPABASE=$mode (expected auto|strict|off)"
    return
  fi

  if [[ "$mode" == "off" ]]; then
    add_result "supabase-checks" "$WARN" "skipped by REVIEW_SUPABASE=off"
    return
  fi

  local missing=()
  command -v supabase >/dev/null 2>&1 || missing+=("supabase-cli")
  command -v docker >/dev/null 2>&1 || missing+=("docker")

  if [[ ${#missing[@]} -gt 0 ]]; then
    add_result "supabase-checks" "$FAIL" "missing prerequisites: ${missing[*]}"
    return
  fi

  if ! docker info >/dev/null 2>&1; then
    add_result "supabase-checks" "$FAIL" "docker daemon unavailable"
    return
  fi

  local setup_output
  if ! setup_output=$(supabase start 2>&1); then
    add_result "supabase-setup" "$FAIL" "supabase start failed"
    return
  fi

  if ! setup_output=$(supabase db reset 2>&1); then
    add_result "supabase-setup" "$FAIL" "supabase db reset failed"
    return
  fi

  if ! setup_output=$(supabase status -o env 2>&1); then
    add_result "supabase-setup" "$FAIL" "supabase status -o env failed"
    return
  fi

  printf '%s\n' "$setup_output" > "$setup_env_file"

  # shellcheck disable=SC1090
  source "$setup_env_file"
  export SUPABASE_URL="${API_URL:-http://127.0.0.1:54321}"
  export VITE_SUPABASE_URL="$SUPABASE_URL"
  export SUPABASE_ANON_KEY="$ANON_KEY"
  export VITE_SUPABASE_ANON_KEY="$ANON_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
  add_result "supabase-setup" "$PASS" "local stack started and env exported"

  run_check "supabase-rls" "pnpm --filter @1000words/app exec vitest run src/data/progressStore.rls.test.ts src/data/profile/rewardRpcs.rls.test.ts src/data/secureBoundary.rls.test.ts --reporter=json --outputFile=/tmp/rls-results.json && EXPECTED_TEST_COUNT=29 node -e 'const r=require(\"/tmp/rls-results.json\"); const expected=Number(process.env.EXPECTED_TEST_COUNT); if (expected <= 0 || r.numTotalTests !== expected || r.numPendingTests || r.numFailedTests || r.numPassedTests !== expected) { console.error({ expected, ...r }); process.exit(1) } console.log(`RLS integration: ${r.numPassedTests}/${expected} passed, 0 skipped`)'
"
  run_check "supabase-smoke" "pnpm --filter @1000words/app supabase:smoke"
}

run_check "lint"               "pnpm lint --quiet"
run_check "typecheck"          "pnpm typecheck"
run_check "unit-tests"         "pnpm test"
run_check "content-validate"   "pnpm --filter @1000words/content validate"
run_check "artifact-validator" "pnpm test:artifact-validator"
run_check "pages-build"        "BASE_URL=/1000-words/ VITE_DEMO_LOGIN=true pnpm --filter @1000words/app build"
run_check "artifact-contents"  "BASE_URL=/1000-words/ pnpm validate:dist"
run_supabase_checks

# Output JSON array for machine consumption
echo "["
for i in "${!NAMES[@]}"; do
  [[ $i -gt 0 ]] && echo ","
  # Escape double quotes in detail
  safe_detail="${DETAILS[$i]//\"/\'}"
  printf '  {"check":"%s","status":"%s","detail":"%s"}' \
    "${NAMES[$i]}" "${STATUSES[$i]}" "$safe_detail"
done
echo ""
echo "]"

[[ $any_failed -eq 1 ]] && exit 1 || exit 0
