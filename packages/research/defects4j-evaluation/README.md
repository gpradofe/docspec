# DocSpec DSTI — Defects4J Evaluation

This directory contains the evaluation framework for assessing DocSpec's
Deep Semantic Test Intelligence (DSTI) against the Defects4J benchmark.

## Overview

The evaluation measures:
1. **Intent Signal Density (ISD)** — how effectively DSTI captures method semantics
2. **Test Generation Quality** — relevance and coverage of generated test stubs
3. **Bug Detection Potential** — correlation between DSTI signals and known bugs

## Setup

```bash
./setup.sh
```

## Running the Evaluation

```bash
# Run on specific projects
python3 run-experiment.py --projects Lang,Math,Time --verbose

# Run on all projects
python3 run-experiment.py --all

# Run specific bug range
python3 run-experiment.py --project Chart --bugs 1-10
```

## Analyzing Results

```bash
python3 analyze-results.py
```

## Output

- `results/raw/` — Per-project JSON results
- `results/analysis/` — Summary stats, plots, LaTeX tables
- `results/reports/` — Generated reports
