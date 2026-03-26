#!/bin/bash
# Defects4J Evaluation Setup for DocSpec DSTI
#
# This script sets up the environment to evaluate DocSpec's DSTI
# (Deep Semantic Test Intelligence) against the Defects4J benchmark.
#
# Prerequisites:
#   - Java 17+
#   - Maven 3.9+
#   - Python 3.11+
#   - Git
#   - Defects4J (https://github.com/rjust/defects4j)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_DIR="$SCRIPT_DIR/workspace"
RESULTS_DIR="$SCRIPT_DIR/results"

echo "=== DocSpec DSTI Defects4J Evaluation Setup ==="

# 1. Check prerequisites
echo "[1/5] Checking prerequisites..."
command -v java >/dev/null 2>&1 || { echo "ERROR: Java not found"; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo "ERROR: Maven not found"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3 not found"; exit 1; }
command -v defects4j >/dev/null 2>&1 || { echo "WARNING: defects4j not on PATH, will clone"; }

JAVA_VERSION=$(java -version 2>&1 | head -n1 | awk -F'"' '{print $2}')
echo "  Java: $JAVA_VERSION"
echo "  Maven: $(mvn --version | head -n1)"
echo "  Python: $(python3 --version)"

# 2. Create workspace
echo "[2/5] Creating workspace..."
mkdir -p "$EVAL_DIR"
mkdir -p "$RESULTS_DIR"
mkdir -p "$RESULTS_DIR/raw"
mkdir -p "$RESULTS_DIR/analysis"
mkdir -p "$RESULTS_DIR/reports"

# 3. Install Defects4J if not available
if ! command -v defects4j >/dev/null 2>&1; then
    echo "[3/5] Installing Defects4J..."
    if [ ! -d "$EVAL_DIR/defects4j" ]; then
        git clone https://github.com/rjust/defects4j.git "$EVAL_DIR/defects4j"
    fi
    cd "$EVAL_DIR/defects4j"
    ./init.sh
    export PATH="$EVAL_DIR/defects4j/framework/bin:$PATH"
else
    echo "[3/5] Defects4J already available"
fi

# 4. Build DocSpec
echo "[4/5] Building DocSpec..."
cd "$SCRIPT_DIR/../.."
if [ -d "java" ]; then
    cd java
    mvn install -DskipTests -q
    echo "  DocSpec Java modules built successfully"
else
    echo "  WARNING: java/ directory not found"
fi

# 5. Install Python dependencies
echo "[5/5] Installing Python dependencies..."
cd "$SCRIPT_DIR"
python3 -m pip install --quiet pandas matplotlib seaborn scipy tabulate

echo ""
echo "=== Setup complete ==="
echo "Workspace: $EVAL_DIR"
echo "Results:   $RESULTS_DIR"
echo ""
echo "Next steps:"
echo "  1. Run: python3 run-experiment.py --projects Lang,Math,Time"
echo "  2. Analyze: python3 analyze-results.py"
