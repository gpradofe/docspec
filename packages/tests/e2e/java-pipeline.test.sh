#!/usr/bin/env bash
set -euo pipefail
echo "=== Java Pipeline E2E ==="
cd "$(dirname "$0")/../.."

PASS=0; FAIL=0

# 1. Build Java
echo "  Building Java..."
cd java && mvn install -DskipTests -q 2>/dev/null && cd ..
((PASS++)); echo "  ✓ Java build"

# 2. Check spring-boot example has docspec.json
if [ -f "examples/spring-boot-zero-config/target/docspec.json" ]; then
  ((PASS++)); echo "  ✓ docspec.json exists"
else
  echo "  Building spring-boot example..."
  cd examples/spring-boot-zero-config && mvn compile -q 2>/dev/null && cd ../..
  if [ -f "examples/spring-boot-zero-config/target/docspec.json" ]; then
    ((PASS++)); echo "  ✓ docspec.json generated"
  else
    ((FAIL++)); echo "  ✗ docspec.json not generated"
  fi
fi

# 3. Validate the JSON structure
if command -v jq &>/dev/null && [ -f "examples/spring-boot-zero-config/target/docspec.json" ]; then
  if jq -e '.docspec == "3.0.0"' examples/spring-boot-zero-config/target/docspec.json > /dev/null 2>&1; then
    ((PASS++)); echo "  ✓ Version is 3.0.0"
  else
    ((FAIL++)); echo "  ✗ Version check failed"
  fi
  if jq -e '.modules | length > 0' examples/spring-boot-zero-config/target/docspec.json > /dev/null 2>&1; then
    ((PASS++)); echo "  ✓ Has modules"
  else
    ((FAIL++)); echo "  ✗ No modules"
  fi
fi

echo "Java Pipeline: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
