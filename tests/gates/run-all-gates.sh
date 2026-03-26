#!/usr/bin/env bash
set -euo pipefail
echo "╔═══════════════════════════════════════╗"
echo "║     DocSpec Acceptance Gates           ║"
echo "╚═══════════════════════════════════════╝"

cd "$(dirname "$0")/../.."

TOTAL_PASS=0; TOTAL_FAIL=0
for gate in structural functional parity self-doc integration; do
  echo ""
  if bash "tests/gates/${gate}.sh"; then
    ((TOTAL_PASS++))
  else
    ((TOTAL_FAIL++))
  fi
done

echo ""
echo "════════════════════════════════════════"
echo "Gates: $TOTAL_PASS passed, $TOTAL_FAIL failed"
[ "$TOTAL_FAIL" -eq 0 ] && echo "ALL GATES PASSED ✓" || echo "GATES FAILED ✗"
exit $TOTAL_FAIL
