#!/usr/bin/env bash
# Runs all automated quality checks and outputs a structured results table.
# Matches the same check order as CI (.github/workflows/ci.yml).
# Exit code: 0 if all pass, 1 if any fail.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS="pass"
FAIL="fail"
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

run_check "lint"             "pnpm lint --quiet"
run_check "typecheck"        "pnpm typecheck"
run_check "unit-tests"       "pnpm test"
run_check "content-validate" "pnpm --filter @1000words/content validate"
run_check "app-build"        "pnpm --filter @1000words/app build"

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
