#!/usr/bin/env bash
set -euo pipefail
echo "=== Parity Gate ==="

PASS=0; FAIL=0

for lang in typescript python rust csharp go; do
  if [ -d "annotations/$lang" ]; then ((PASS++)); echo "  ✓ $lang annotations"; else ((FAIL++)); echo "  ✗ $lang annotations"; fi
  if [ -d "processors/$lang" ]; then ((PASS++)); echo "  ✓ $lang processor"; else ((FAIL++)); echo "  ✗ $lang processor"; fi
done

echo "Parity: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
