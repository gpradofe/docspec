#!/usr/bin/env bash
set -euo pipefail
echo "=== Self-Documentation Gate ==="

PASS=0; FAIL=0

PKG_INFO=$(find java -name "package-info.java" | wc -l)
if [ "$PKG_INFO" -ge 11 ]; then ((PASS++)); echo "  ✓ package-info.java: $PKG_INFO"; else ((FAIL++)); echo "  ✗ package-info.java: $PKG_INFO"; fi

# Check DSTI annotations exist in processor
DSTI_ANN=$(grep -rl "@DocBoundary\|@DocInvariant\|@DocDeterministic\|@DocMethod" java/docspec-processor-java/src --include="*.java" | wc -l)
if [ "$DSTI_ANN" -ge 10 ]; then ((PASS++)); echo "  ✓ Self-annotations: $DSTI_ANN files"; else ((FAIL++)); echo "  ✗ Self-annotations: $DSTI_ANN files (expected >= 10)"; fi

echo "Self-doc: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
