#!/bin/bash
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "=== Step 1: Build Java ==="
mvn install -DskipTests -q

echo "=== Step 2: Generate docspec.json ==="
cd "$ROOT/packages/processor/java"
mvn io.docspec:docspec-maven-plugin:generate -q
cd "$ROOT"

echo "=== Step 3: Copy artifacts ==="
mkdir -p docspec-docs
cp packages/processor/java/target/docspec.json docspec-docs/docspec-processor.json
cp packages/build-plugins/maven/target/classes/docspec.json docspec-docs/docspec-maven-plugin.json 2>/dev/null || true

echo "=== Step 4: Build site packages ==="
cd "$ROOT/packages/site"
pnpm install 2>/dev/null || true
pnpm -r build 2>/dev/null || true
cd "$ROOT"

echo "=== Step 5: Resolve (generate site-data.json) ==="
cd "$ROOT/docspec-docs"
node "$ROOT/packages/site/cli/dist/index.js" resolve -c docspec.config.yaml
cd "$ROOT"

echo "=== Step 6: Copy site data to app ==="
mkdir -p packages/site/app/.docspec-cache
cp docspec-docs/.docspec-cache/site-data.json packages/site/app/.docspec-cache/

echo "=== Step 7: Start dev server ==="
echo "Starting at http://localhost:3000"
cd "$ROOT/packages/site/app"
npx next dev -p 3000
