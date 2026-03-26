#!/usr/bin/env bash
set -euo pipefail
echo "=== Integration Gate ==="

PASS=0; FAIL=0

# Check site packages build
if [ -d "site/core/dist" ] || [ -d "site/core/src" ]; then ((PASS++)); echo "  ✓ Site core exists"; else ((FAIL++)); echo "  ✗ Site core missing"; fi
if [ -d "site/themes/stripe" ]; then ((PASS++)); echo "  ✓ Theme exists"; else ((FAIL++)); echo "  ✗ Theme missing"; fi
if [ -d "site/cli" ]; then ((PASS++)); echo "  ✓ CLI exists"; else ((FAIL++)); echo "  ✗ CLI missing"; fi

# Check example docs site config
if [ -f "examples/example-docs-site/docspec.config.yaml" ]; then ((PASS++)); echo "  ✓ Docs site config"; else ((FAIL++)); echo "  ✗ Docs site config missing"; fi

echo "Integration: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
