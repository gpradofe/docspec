"""Calculate the Intent Signal Density (ISD) score for a method.

Mirrors the Java ``IntentDensityCalculator``: uses 13 weighted channels to
produce a score between 0.0 and 1.0 indicating how much semantic intent
information can be extracted from the method's source code.

ISD formula (weights sum to 1.0)::

    ISD = w1*nameSemantics + w2*guardClauses + w3*branches + w4*dataFlow
        + w5*returnType + w6*loops + w7*errorHandling + w8*constants
        + w9*noneChecks + w10*assertions + w11*logging + w12*dependencies
        + w13*decorators
"""
# @docspec:module {
#   id: "docspec-py-intent-density-calculator",
#   name: "Intent Density Calculator",
#   description: "Computes the Intent Signal Density (ISD) score from 13 weighted channels, producing a normalized 0.0-1.0 metric for method semantic richness.",
#   since: "3.0.0"
# }
from __future__ import annotations

from typing import Any

# Channel weights (sum = 1.0)
_W_NAME_SEMANTICS = 0.15
_W_GUARD_CLAUSES = 0.10
_W_BRANCHES = 0.10
_W_DATA_FLOW = 0.05
_W_RETURN_TYPE = 0.05
_W_LOOPS = 0.08
_W_ERROR_HANDLING = 0.10
_W_CONSTANTS = 0.05
_W_NONE_CHECKS = 0.07
_W_ASSERTIONS = 0.07
_W_LOGGING = 0.05
_W_DEPENDENCIES = 0.08
_W_DECORATORS = 0.05


# @docspec:boundary "ISD score computation from intent signal channels"
class IntentDensityCalculator:
    """Compute the ISD score from a method's intent signal dict.

    The *signals* dict is expected to have the shape produced by
    ``IntentExtractor.extract()``::

        {
            "nameSemantics": {"verb": ..., "object": ..., "intent": ...},
            "guardClauses": int,
            "branches": int,
            "errorHandling": {"catchBlocks": int, "caughtTypes": [...]},
            "dependencies": [...],
            "constants": [...],
            ...
        }
    """

    # @docspec:method { since: "3.0.0" }
    # @docspec:deterministic
    # @docspec:intentional "Compute the weighted ISD score from a method's 13 intent signal channels"
    # @docspec:preserves "Score is always clamped to [0.0, 1.0] range"
    def calculate(self, signals: dict[str, Any]) -> float:
        """Return the ISD score in the range [0.0, 1.0]."""
        score = 0.0

        # Channel 1: Name semantics
        name_sem = signals.get("nameSemantics")
        if name_sem and name_sem.get("intent") not in (None, "unknown"):
            score += _W_NAME_SEMANTICS

        # Channel 2: Guard clauses (scaled up to weight)
        guards = signals.get("guardClauses", 0)
        if guards > 0:
            score += min(_W_GUARD_CLAUSES, guards * 0.035)

        # Channel 3: Branches (scaled up to weight)
        branches = signals.get("branches", 0)
        if branches > 0:
            score += min(_W_BRANCHES, branches * 0.025)

        # Channel 4: Data flow
        data_flow = signals.get("dataFlow")
        if data_flow:
            has_reads = bool(data_flow.get("reads"))
            has_writes = bool(data_flow.get("writes"))
            if has_reads and has_writes:
                score += _W_DATA_FLOW
            elif has_reads or has_writes:
                score += _W_DATA_FLOW * 0.5

        # Channel 5: Return type (inferred from verb intent)
        if name_sem and name_sem.get("intent") in ("query", "creation", "transformation"):
            score += _W_RETURN_TYPE

        # Channel 6: Loops / loop properties
        loop_props = signals.get("loopProperties") or signals.get("loops")
        if loop_props:
            loop_score = 0.0
            if loop_props.get("hasStreams") or loop_props.get("hasComprehensions"):
                loop_score += _W_LOOPS * 0.4
            if loop_props.get("hasEnhancedFor") or loop_props.get("hasForLoops"):
                loop_score += _W_LOOPS * 0.3
            stream_ops = loop_props.get("streamOps", [])
            if stream_ops:
                loop_score += min(_W_LOOPS * 0.3, len(stream_ops) * 0.01)
            score += min(_W_LOOPS, loop_score)
        # Fallback: use loop count if present
        elif signals.get("loopCount", 0) > 0:
            score += min(_W_LOOPS, signals["loopCount"] * 0.03)

        # Channel 7: Error handling (scaled up to weight)
        error_handling = signals.get("errorHandling")
        if error_handling:
            catch_blocks = error_handling.get("catchBlocks", 0)
            if catch_blocks > 0:
                score += min(_W_ERROR_HANDLING, catch_blocks * 0.035)

        # Channel 8: Constants (scaled up to weight)
        constants = signals.get("constants", [])
        if constants:
            score += min(_W_CONSTANTS, len(constants) * 0.015)

        # Channel 9: None checks (Python equivalent of null checks)
        none_checks = signals.get("noneChecks", 0) or signals.get("nullChecks", 0)
        if none_checks > 0:
            score += min(_W_NONE_CHECKS, none_checks * 0.02)

        # Channel 10: Assertions
        assertions = signals.get("assertions", 0)
        if assertions > 0:
            score += min(_W_ASSERTIONS, assertions * 0.025)

        # Channel 11: Logging
        log_statements = signals.get("logStatements", 0)
        if log_statements > 0:
            score += min(_W_LOGGING, log_statements * 0.02)

        # Channel 12: Dependencies (function calls)
        dependencies = signals.get("dependencies", [])
        if dependencies:
            score += min(_W_DEPENDENCIES, len(dependencies) * 0.025)

        # Channel 13: Decorators (Python-specific, replaces Java validation annotations)
        decorators = signals.get("decorators", 0)
        if decorators > 0:
            score += min(_W_DECORATORS, decorators * 0.02)

        return min(1.0, round(score, 4))
