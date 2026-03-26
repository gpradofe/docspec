#!/usr/bin/env bash
set -euo pipefail
echo "=== Structural Gate ==="

PASS=0; FAIL=0

# Check schema files exist
check() { if [ -f "$1" ]; then ((PASS++)); echo "  ✓ $1"; else ((FAIL++)); echo "  ✗ $1 missing"; fi; }
check "spec/docspec.schema.json"
check "java/docspec-processor-java/src/main/resources/docspec.schema.json"

# Check schema sync
if diff -q spec/docspec.schema.json java/docspec-processor-java/src/main/resources/docspec.schema.json > /dev/null 2>&1; then
  ((PASS++)); echo "  ✓ Schemas in sync"
else
  ((FAIL++)); echo "  ✗ Schemas out of sync"
fi

# Check Java annotations count (expect 42)
JAVA_ANN=$(find java/docspec-annotations-java/src -name "*.java" ! -name "package-info.java" | wc -l)
if [ "$JAVA_ANN" -ge 42 ]; then ((PASS++)); echo "  ✓ Java annotations: $JAVA_ANN"; else ((FAIL++)); echo "  ✗ Java annotations: $JAVA_ANN (expected >= 42)"; fi

# Check package-info.java files
PKG_INFO=$(find java -name "package-info.java" | wc -l)
if [ "$PKG_INFO" -ge 11 ]; then ((PASS++)); echo "  ✓ package-info.java files: $PKG_INFO"; else ((FAIL++)); echo "  ✗ package-info.java: $PKG_INFO (expected >= 11)"; fi

# Check annotation parity per language
for lang in typescript python rust csharp go; do
  if [ -d "annotations/$lang" ]; then ((PASS++)); echo "  ✓ $lang annotations exist"; else ((FAIL++)); echo "  ✗ $lang annotations missing"; fi
done

echo "Structural: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
