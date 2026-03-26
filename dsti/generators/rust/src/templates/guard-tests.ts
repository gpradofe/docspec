// @docspec:module {
//   id: "docspec-dsti-rust-guard-tests-template",
//   name: "Guard Clause Test Template (Rust/#[test])",
//   description: "Generates Rust #[test] functions for guard clause verification. Creates one #[should_panic] or Result assertion test per detected guard clause, plus tests for Option/Result unwrap safety, driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { RustTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates Rust guard clause test stubs from DSTI intent signals"
 * @docspec:deterministic
 */
export function generateGuardTests(method: IntentMethod, config: RustTestGeneratorConfig): GeneratedTestFile[] {
  const { moduleName, fnName } = parseQualified(method.qualified);
  const snakeFn = camelToSnake(fnName);
  const snakeModule = camelToSnake(moduleName);
  const testFileName = `test_${snakeModule}_${snakeFn}_guards.rs`;

  const signals = method.intentSignals!;
  const guardCount = typeof signals.guardClauses === "number"
    ? signals.guardClauses
    : (Array.isArray(signals.guardClauses) ? signals.guardClauses.length : 0);

  const nullChecks = signals.nullChecks ?? 0;
  const branchCount = typeof signals.branches === "number"
    ? signals.branches
    : (Array.isArray(signals.branches) ? signals.branches.length : 0);

  let testFunctions = "";

  // Generate a test for each guard clause
  for (let i = 0; i < guardCount; i++) {
    const guardInfo = Array.isArray(signals.guardClauses) ? signals.guardClauses[i] : null;
    const condition = guardInfo?.condition ?? `guard condition ${i + 1}`;
    const error = guardInfo?.error ?? "Error";
    const boundary = guardInfo?.boundary ?? "input";

    // Determine if the function returns Result or panics
    const usesResult = error.includes("Error") || error.includes("Err");

    if (usesResult) {
      testFunctions += `
    #[test]
    fn test_${snakeFn}_enforces_guard_${i + 1}() {
        // Guard: ${escapeRust(condition)} (${boundary})
        // Expected: Err variant
        let result = ${snakeFn}(/* invalid ${boundary} input */);
        assert!(
            result.is_err(),
            "Expected Err for guard violation: ${escapeRust(condition)}"
        );
    }
`;
    } else {
      testFunctions += `
    #[test]
    #[should_panic(expected = "${escapeRust(error)}")]
    fn test_${snakeFn}_enforces_guard_${i + 1}() {
        // Guard: ${escapeRust(condition)} (${boundary})
        ${snakeFn}(/* invalid ${boundary} input */);
    }
`;
    }
  }

  // Generate Option None handling tests based on null checks
  if (nullChecks > 0) {
    testFunctions += `
    #[test]
    fn test_${snakeFn}_handles_none_input() {
        // ${nullChecks} null/None check(s) detected in source
        let result = ${snakeFn}(None);
        assert!(
            result.is_err() || result.is_none(),
            "Expected error or None for None input"
        );
    }
`;
  }

  // Valid input smoke test
  testFunctions += `
    #[test]
    fn test_${snakeFn}_accepts_valid_input() {
        // Smoke test: valid input should not panic
        let result = ${snakeFn}(/* valid input */);
        assert!(result.is_ok(), "Valid input should produce Ok result");
    }
`;

  // Branch coverage hint
  if (branchCount >= 3) {
    testFunctions += `
    #[test]
    fn test_${snakeFn}_covers_${branchCount}_branches() {
        // ${branchCount} branches detected
        // TODO: Add tests for each conditional branch using match/if-let patterns
        assert!(true);
    }
`;
  }

  const content = `//! Guard clause tests for ${moduleName}::${fnName}.
//! Auto-generated from DSTI intent signals.
//!
//! Guard clauses: ${guardCount}
//! Null checks: ${nullChecks}
//! Branches: ${branchCount}

#[cfg(test)]
mod ${snakeFn}_guard_tests {
    use super::*;
    // use ${config.crateName}::${snakeModule}::${snakeFn};
${testFunctions}
}
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "guard",
  }];
}

function parseQualified(qualified: string): { moduleName: string; fnName: string } {
  const parts = qualified.split("#");
  const moduleName = parts[0].split(".").pop() ?? parts[0].split("::").pop() ?? "unknown";
  const fnName = parts[1] ?? "unknown_fn";
  return { moduleName, fnName };
}

function camelToSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function escapeRust(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
