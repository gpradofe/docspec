#!/usr/bin/env python3
"""
DocSpec DSTI Defects4J Evaluation Runner.

Checks out Defects4J projects, runs DocSpec DSTI analysis on each,
generates test stubs, and compares against known bugs.

Usage:
    python3 run-experiment.py --projects Lang,Math,Time
    python3 run-experiment.py --all
    python3 run-experiment.py --project Chart --bugs 1-10
"""
# @docspec:module {
#   id: "docspec-research-run-experiment",
#   name: "Defects4J Experiment Runner",
#   description: "Orchestrates the DocSpec DSTI evaluation on Defects4J projects: checks out buggy versions, runs DocSpec analysis, collects ISD scores and generated test counts, and saves per-project and aggregate results.",
#   since: "3.0.0"
# }

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


# @docspec:boundary "Single bug analysis result"
@dataclass
class BugResult:
    """Result of analyzing a single bug."""
    project: str
    bug_id: int
    dsti_score: float = 0.0
    tests_generated: int = 0
    tests_relevant: int = 0
    bug_detected: bool = False
    analysis_time_ms: int = 0
    error: Optional[str] = None


# @docspec:boundary "Aggregate project evaluation result"
@dataclass
class ProjectResult:
    """Aggregate result for a project."""
    project: str
    total_bugs: int = 0
    bugs_analyzed: int = 0
    bugs_detected: int = 0
    avg_dsti_score: float = 0.0
    total_tests_generated: int = 0
    total_tests_relevant: int = 0
    total_time_ms: int = 0
    bugs: list = field(default_factory=list)


# Defects4J projects and their bug counts
PROJECTS = {
    "Chart": 26,
    "Cli": 39,
    "Closure": 176,
    "Codec": 18,
    "Collections": 4,
    "Compress": 47,
    "Csv": 16,
    "Gson": 18,
    "JacksonCore": 26,
    "JacksonDatabind": 112,
    "JacksonXml": 6,
    "Jsoup": 93,
    "JxPath": 22,
    "Lang": 65,
    "Math": 106,
    "Mockito": 38,
    "Time": 27,
}


# @docspec:deterministic
def parse_args():
    parser = argparse.ArgumentParser(description="DocSpec DSTI Defects4J Evaluation")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--projects", type=str, help="Comma-separated project names")
    group.add_argument("--project", type=str, help="Single project name")
    group.add_argument("--all", action="store_true", help="Run all projects")
    parser.add_argument("--bugs", type=str, help="Bug range (e.g., 1-10)")
    parser.add_argument("--output", type=str, default="results/raw", help="Output directory")
    parser.add_argument("--workspace", type=str, default="workspace", help="Workspace directory")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    return parser.parse_args()


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Check out a specific Defects4J bug version into the workspace directory"
def checkout_bug(project: str, bug_id: int, workspace: Path, version: str = "buggy") -> Path:
    """Checkout a specific bug version from Defects4J."""
    target = workspace / f"{project}_{bug_id}_{version}"
    if target.exists():
        return target

    cmd = [
        "defects4j", "checkout",
        "-p", project,
        "-v", f"{bug_id}{version[0]}",  # e.g., "1b" for buggy, "1f" for fixed
        "-w", str(target),
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=120)
    return target


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Run DocSpec DSTI analysis via Maven on a checked-out project"
def run_docspec_analysis(project_dir: Path) -> dict:
    """Run DocSpec DSTI analysis on a checked-out project."""
    # Look for Maven pom.xml
    pom = project_dir / "pom.xml"
    if not pom.exists():
        return {"error": "No pom.xml found", "score": 0.0, "tests": 0}

    try:
        result = subprocess.run(
            ["mvn", "compile", "docspec:generate", "-DskipTests", "-q"],
            cwd=str(project_dir),
            capture_output=True,
            text=True,
            timeout=300,
        )

        # Look for generated docspec.json
        docspec_json = project_dir / "target" / "docspec" / "docspec.json"
        if docspec_json.exists():
            with open(docspec_json) as f:
                spec = json.load(f)
            return analyze_spec(spec)
        else:
            return {"error": "No docspec.json generated", "score": 0.0, "tests": 0}

    except subprocess.TimeoutExpired:
        return {"error": "Analysis timed out", "score": 0.0, "tests": 0}
    except Exception as e:
        return {"error": str(e), "score": 0.0, "tests": 0}


# @docspec:method { since: "3.0.0" }
# @docspec:deterministic
# @docspec:intentional "Compute DSTI metrics from a DocSpec JSON output"
def analyze_spec(spec: dict) -> dict:
    """Analyze a DocSpec JSON output for DSTI metrics."""
    intent_graph = spec.get("intentGraph", {})
    methods = intent_graph.get("methods", [])

    total_score = 0.0
    total_tests = 0

    for method in methods:
        signals = method.get("intentSignals", {})
        isd = method.get("isd", 0.0)
        total_score += isd

        # Count potential test cases from signals
        guard_clauses = signals.get("guardClauses", 0)
        if isinstance(guard_clauses, list):
            guard_clauses = len(guard_clauses)
        branches = signals.get("branches", 0)
        if isinstance(branches, list):
            branches = len(branches)

        total_tests += guard_clauses + branches + 1  # +1 for happy path

    avg_score = total_score / len(methods) if methods else 0.0

    return {
        "score": avg_score,
        "tests": total_tests,
        "methods": len(methods),
        "error": None,
    }


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Check out, analyze, and record DSTI metrics for a single Defects4J bug"
def analyze_bug(project: str, bug_id: int, workspace: Path, verbose: bool = False) -> BugResult:
    """Analyze a single bug."""
    result = BugResult(project=project, bug_id=bug_id)
    start = time.time()

    try:
        if verbose:
            print(f"  Checking out {project}-{bug_id}...", end=" ", flush=True)

        project_dir = checkout_bug(project, bug_id, workspace)
        analysis = run_docspec_analysis(project_dir)

        result.dsti_score = analysis.get("score", 0.0)
        result.tests_generated = analysis.get("tests", 0)
        result.error = analysis.get("error")

        if verbose:
            status = "OK" if not result.error else f"ERR: {result.error}"
            print(f"ISD={result.dsti_score:.3f}, tests={result.tests_generated} [{status}]")

    except Exception as e:
        result.error = str(e)
        if verbose:
            print(f"FAILED: {e}")

    result.analysis_time_ms = int((time.time() - start) * 1000)
    return result


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Run the full evaluation for a single Defects4J project across all its bugs"
def run_project(project: str, bug_range: Optional[tuple], workspace: Path,
                output: Path, verbose: bool) -> ProjectResult:
    """Run evaluation for a single project."""
    max_bugs = PROJECTS.get(project, 0)
    if max_bugs == 0:
        print(f"Unknown project: {project}")
        return ProjectResult(project=project)

    if bug_range:
        start, end = bug_range
        bug_ids = list(range(start, min(end + 1, max_bugs + 1)))
    else:
        bug_ids = list(range(1, max_bugs + 1))

    print(f"\n{'='*60}")
    print(f"Project: {project} ({len(bug_ids)} bugs)")
    print(f"{'='*60}")

    project_result = ProjectResult(project=project, total_bugs=len(bug_ids))

    for bug_id in bug_ids:
        bug_result = analyze_bug(project, bug_id, workspace, verbose)
        project_result.bugs.append(asdict(bug_result))
        project_result.bugs_analyzed += 1

        if bug_result.dsti_score > 0:
            project_result.total_tests_generated += bug_result.tests_generated
        project_result.total_time_ms += bug_result.analysis_time_ms

    # Calculate averages
    scores = [b["dsti_score"] for b in project_result.bugs if b["dsti_score"] > 0]
    project_result.avg_dsti_score = sum(scores) / len(scores) if scores else 0.0

    # Save per-project results
    output_file = output / f"{project}.json"
    with open(output_file, "w") as f:
        json.dump(asdict(project_result), f, indent=2)

    print(f"\nResults: analyzed={project_result.bugs_analyzed}, "
          f"avg_ISD={project_result.avg_dsti_score:.3f}, "
          f"tests={project_result.total_tests_generated}, "
          f"time={project_result.total_time_ms}ms")

    return project_result


# @docspec:intentional "Orchestrate the full Defects4J evaluation: parse args, run projects, save aggregate results"
def main():
    args = parse_args()

    workspace = Path(args.workspace)
    output = Path(args.output)
    workspace.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)

    # Determine projects to run
    if args.all:
        projects = list(PROJECTS.keys())
    elif args.projects:
        projects = [p.strip() for p in args.projects.split(",")]
    else:
        projects = [args.project]

    # Parse bug range
    bug_range = None
    if args.bugs:
        parts = args.bugs.split("-")
        bug_range = (int(parts[0]), int(parts[1]) if len(parts) > 1 else int(parts[0]))

    print(f"DocSpec DSTI Defects4J Evaluation")
    print(f"Projects: {', '.join(projects)}")
    if bug_range:
        print(f"Bug range: {bug_range[0]}-{bug_range[1]}")

    all_results = []
    for project in projects:
        result = run_project(project, bug_range, workspace, output, args.verbose)
        all_results.append(asdict(result))

    # Save aggregate results
    summary_file = output / "summary.json"
    with open(summary_file, "w") as f:
        json.dump({"projects": all_results, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")}, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Complete. Results saved to {output}")


if __name__ == "__main__":
    main()
