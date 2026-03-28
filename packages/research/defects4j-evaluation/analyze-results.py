#!/usr/bin/env python3
"""
Analyze DocSpec DSTI Defects4J evaluation results.

Reads raw results from the evaluation runner and produces:
  - Summary statistics (per-project and aggregate)
  - Correlation analysis (ISD score vs. bug detection)
  - Visualizations (charts saved as PNG)
  - LaTeX-ready tables

Usage:
    python3 analyze-results.py
    python3 analyze-results.py --input results/raw --output results/analysis
"""
# @docspec:module {
#   id: "docspec-research-analyze-results",
#   name: "Defects4J Results Analyzer",
#   description: "Analyzes DocSpec DSTI evaluation results from Defects4J, computing summary statistics, ISD-to-test correlations, generating plots, and producing LaTeX tables.",
#   since: "3.0.0"
# }

import argparse
import json
import sys
from pathlib import Path

try:
    import pandas as pd
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import seaborn as sns
    from scipy import stats
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install pandas matplotlib seaborn scipy")
    sys.exit(1)


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Load all per-project JSON result files into a single DataFrame"
def load_results(input_dir: Path) -> pd.DataFrame:
    """Load all project results into a single DataFrame."""
    all_bugs = []
    for json_file in sorted(input_dir.glob("*.json")):
        if json_file.name == "summary.json":
            continue
        with open(json_file) as f:
            data = json.load(f)
        for bug in data.get("bugs", []):
            all_bugs.append(bug)

    return pd.DataFrame(all_bugs)


# @docspec:method { since: "3.0.0" }
# @docspec:deterministic
# @docspec:intentional "Compute per-project aggregate statistics from bug analysis data"
def summary_statistics(df: pd.DataFrame) -> pd.DataFrame:
    """Compute per-project summary statistics."""
    return df.groupby("project").agg(
        total_bugs=("bug_id", "count"),
        avg_isd=("dsti_score", "mean"),
        median_isd=("dsti_score", "median"),
        std_isd=("dsti_score", "std"),
        total_tests=("tests_generated", "sum"),
        avg_tests=("tests_generated", "mean"),
        errors=("error", lambda x: x.notna().sum()),
        avg_time_ms=("analysis_time_ms", "mean"),
    ).round(4)


# @docspec:method { since: "3.0.0" }
# @docspec:deterministic
# @docspec:intentional "Analyze Pearson correlation between ISD scores and test generation counts"
def correlation_analysis(df: pd.DataFrame) -> dict:
    """Analyze correlation between ISD scores and test generation."""
    valid = df[df["dsti_score"] > 0].copy()

    if len(valid) < 3:
        return {"error": "Not enough data points for correlation analysis"}

    # ISD vs tests generated
    r_isd_tests, p_isd_tests = stats.pearsonr(valid["dsti_score"], valid["tests_generated"])

    # ISD distribution statistics
    isd_stats = {
        "mean": float(valid["dsti_score"].mean()),
        "median": float(valid["dsti_score"].median()),
        "std": float(valid["dsti_score"].std()),
        "min": float(valid["dsti_score"].min()),
        "max": float(valid["dsti_score"].max()),
        "q25": float(valid["dsti_score"].quantile(0.25)),
        "q75": float(valid["dsti_score"].quantile(0.75)),
    }

    return {
        "correlation_isd_tests": {"r": round(r_isd_tests, 4), "p": round(p_isd_tests, 6)},
        "isd_distribution": isd_stats,
        "n_valid": len(valid),
        "n_total": len(df),
    }


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Generate ISD distribution, per-project, scatter, and timing plots as PNG files"
def generate_plots(df: pd.DataFrame, output_dir: Path):
    """Generate visualization plots."""
    valid = df[df["dsti_score"] > 0].copy()

    if len(valid) == 0:
        print("  No valid data for plots")
        return

    # 1. ISD Distribution
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.histplot(valid["dsti_score"], bins=30, kde=True, ax=ax)
    ax.set_xlabel("Intent Signal Density (ISD)")
    ax.set_ylabel("Count")
    ax.set_title("Distribution of ISD Scores Across Defects4J Bugs")
    fig.savefig(output_dir / "isd-distribution.png", dpi=150, bbox_inches="tight")
    plt.close()

    # 2. ISD by Project
    fig, ax = plt.subplots(figsize=(12, 6))
    project_order = valid.groupby("project")["dsti_score"].median().sort_values(ascending=False).index
    sns.boxplot(data=valid, x="project", y="dsti_score", order=project_order, ax=ax)
    ax.set_xlabel("Project")
    ax.set_ylabel("ISD Score")
    ax.set_title("ISD Scores by Defects4J Project")
    plt.xticks(rotation=45, ha="right")
    fig.savefig(output_dir / "isd-by-project.png", dpi=150, bbox_inches="tight")
    plt.close()

    # 3. ISD vs Tests Generated
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.scatterplot(data=valid, x="dsti_score", y="tests_generated", hue="project", alpha=0.7, ax=ax)
    ax.set_xlabel("ISD Score")
    ax.set_ylabel("Tests Generated")
    ax.set_title("ISD Score vs Generated Tests")
    ax.legend(bbox_to_anchor=(1.05, 1), loc="upper left", fontsize=8)
    fig.savefig(output_dir / "isd-vs-tests.png", dpi=150, bbox_inches="tight")
    plt.close()

    # 4. Analysis Time Distribution
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.histplot(df["analysis_time_ms"] / 1000, bins=30, kde=True, ax=ax)
    ax.set_xlabel("Analysis Time (seconds)")
    ax.set_ylabel("Count")
    ax.set_title("DocSpec Analysis Time Distribution")
    fig.savefig(output_dir / "analysis-time.png", dpi=150, bbox_inches="tight")
    plt.close()

    print(f"  Generated 4 plots in {output_dir}")


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Generate a LaTeX table from summary statistics for the research paper"
def generate_latex_table(summary: pd.DataFrame, output_dir: Path):
    """Generate LaTeX table for the research paper."""
    latex = summary.to_latex(
        float_format="%.3f",
        caption="DocSpec DSTI Evaluation Results on Defects4J",
        label="tab:defects4j-results",
    )
    with open(output_dir / "results-table.tex", "w") as f:
        f.write(latex)


# @docspec:intentional "Orchestrate the full analysis pipeline: load results, compute statistics, generate plots and LaTeX tables"
def main():
    parser = argparse.ArgumentParser(description="Analyze Defects4J evaluation results")
    parser.add_argument("--input", type=str, default="results/raw", help="Input directory")
    parser.add_argument("--output", type=str, default="results/analysis", help="Output directory")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        print(f"Input directory not found: {input_dir}")
        print("Run run-experiment.py first.")
        sys.exit(1)

    print("Loading results...")
    df = load_results(input_dir)
    if df.empty:
        print("No results found.")
        sys.exit(1)

    print(f"Loaded {len(df)} bug analyses across {df['project'].nunique()} projects")

    print("\nComputing summary statistics...")
    summary = summary_statistics(df)
    print(summary.to_string())
    summary.to_csv(output_dir / "summary.csv")

    print("\nCorrelation analysis...")
    correlations = correlation_analysis(df)
    print(json.dumps(correlations, indent=2))
    with open(output_dir / "correlations.json", "w") as f:
        json.dump(correlations, f, indent=2)

    print("\nGenerating plots...")
    generate_plots(df, output_dir)

    print("\nGenerating LaTeX table...")
    generate_latex_table(summary, output_dir)

    print(f"\nAnalysis complete. Results in {output_dir}")


if __name__ == "__main__":
    main()
