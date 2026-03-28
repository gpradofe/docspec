#!/usr/bin/env bash
set -euo pipefail
echo "=== Tier Matrix E2E ==="
cd "$(dirname "$0")/../.."

PASS=0; FAIL=0

# Tier 0 examples should exist
for dir in typescript-express-zero-config python-flask-zero-config rust-lib-zero-config csharp-webapi-zero-config go-rest-zero-config; do
  if [ -d "examples/$dir" ]; then ((PASS++)); echo "  ✓ Tier 0: $dir"; else ((FAIL++)); echo "  ✗ Tier 0: $dir missing"; fi
done

# Tier 1 examples should exist
for dir in typescript-minimal python-minimal rust-minimal csharp-minimal go-minimal; do
  if [ -d "examples/$dir" ]; then ((PASS++)); echo "  ✓ Tier 1: $dir"; else ((FAIL++)); echo "  ✗ Tier 1: $dir missing"; fi
done

# Tier 2 examples should exist
for dir in typescript-full-annotated python-full-annotated rust-full-annotated csharp-full-annotated go-full-annotated; do
  if [ -d "examples/$dir" ]; then ((PASS++)); echo "  ✓ Tier 2: $dir"; else ((FAIL++)); echo "  ✗ Tier 2: $dir missing"; fi
done

echo "Tier Matrix: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
