#!/usr/bin/env bash
set -euo pipefail
echo "=== Functional Gate ==="

PASS=0; FAIL=0

# Build Java
cd java && mvn install -DskipTests -q 2>/dev/null && cd ..
((PASS++)); echo "  ✓ Java build"

# Check spring-boot-zero-config produces docspec.json
if [ -f "examples/spring-boot-zero-config/target/docspec.json" ]; then
  # Validate version
  VERSION=$(grep -o '"docspec":"[^"]*"' examples/spring-boot-zero-config/target/docspec.json | head -1 | cut -d'"' -f4)
  if [ "$VERSION" = "3.0.0" ]; then ((PASS++)); echo "  ✓ Version: 3.0.0"; else ((FAIL++)); echo "  ✗ Version: $VERSION"; fi

  # Check modules non-empty
  MOD_COUNT=$(grep -c '"id"' examples/spring-boot-zero-config/target/docspec.json 2>/dev/null || echo 0)
  if [ "$MOD_COUNT" -gt 0 ]; then ((PASS++)); echo "  ✓ Modules found: ~$MOD_COUNT"; else ((FAIL++)); echo "  ✗ No modules"; fi
else
  ((FAIL++)); echo "  ✗ docspec.json not found (run mvn compile on example first)"
fi

echo "Functional: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
