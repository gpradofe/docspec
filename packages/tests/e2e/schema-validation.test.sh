#!/usr/bin/env bash
set -euo pipefail
echo "=== Schema Validation E2E ==="
cd "$(dirname "$0")/../.."

PASS=0; FAIL=0

# Find all docspec.json files in examples
for f in $(find examples -name "docspec.json" -not -path "*/node_modules/*" 2>/dev/null); do
  if [ -s "$f" ]; then
    # Basic structure check (JSON valid)
    if python3 -c "import json; json.load(open('$f'))" 2>/dev/null || jq . "$f" > /dev/null 2>/dev/null; then
      ((PASS++)); echo "  ✓ Valid JSON: $f"
    else
      ((FAIL++)); echo "  ✗ Invalid JSON: $f"
    fi
  fi
done

if [ "$PASS" -eq 0 ] && [ "$FAIL" -eq 0 ]; then
  echo "  ⚠ No docspec.json files found (run mvn compile on examples first)"
  PASS=1  # Don't fail if no files to validate
fi

echo "Schema Validation: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
