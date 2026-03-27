// @docspec:module {
//   id: "docspec-dsti-rust-property-tests-template",
//   name: "Property-Based Test Template (Rust/proptest)",
//   description: "Generates proptest property-based test macros driven by DSTI intent signals. Creates idempotency tests for queries, state-change tests for mutations, conservation tests when reads/writes coexist, and iterator pipeline tests.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { RustTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates proptest property-based test stubs using intent-driven templates"
 * @docspec:deterministic
 */
export function generatePropertyTests(method: IntentMethod, config: RustTestGeneratorConfig): GeneratedTestFile[] {
  const { moduleName, fnName } = parseQualified(method.qualified);
  const snakeFn = camelToSnake(fnName);
  const snakeModule = camelToSnake(moduleName);
  const testFileName = `test_${snakeModule}_${snakeFn}_property.rs`;

  const signals = method.intentSignals!;
  const intent = signals.nameSemantics?.intent;
  const isd = signals.intentDensityScore ?? 0;
  const hasReads = (signals.dataFlow?.reads?.length ?? 0) > 0;
  const hasWrites = (signals.dataFlow?.writes?.length ?? 0) > 0;
  const hasStreams = signals.loopProperties?.hasStreams ?? false;
  const hasEnhancedFor = signals.loopProperties?.hasEnhancedFor ?? false;
  const streamOps = signals.loopProperties?.streamOps ?? [];
  const catchBlocks = signals.errorHandling?.catchBlocks ?? 0;
  const caughtTypes = signals.errorHandling?.caughtTypes ?? [];

  let proptestCases = "";
  let regularTests = "";

  // Idempotency property for queries
  if (intent === "query") {
    proptestCases += `
        #[test]
        fn test_${snakeFn}_is_idempotent(input in "\\\\PC{0,100}") {
            let result1 = ${snakeFn}(&input);
            let result2 = ${snakeFn}(&input);
            prop_assert_eq!(result1, result2);
        }
`;
  }

  // Mutation property: state changes
  if (intent === "creation" || intent === "mutation") {
    proptestCases += `
        #[test]
        fn test_${snakeFn}_changes_state(input in "\\\\PC{0,100}") {
            let mut sut = create_test_instance();
            let before = format!("{:?}", sut);
            sut.${snakeFn}(&input);
            let after = format!("{:?}", sut);
            prop_assert_ne!(before, after);
        }
`;
  }

  // Conservation property: data integrity across read/write
  if (hasReads && hasWrites) {
    const reads = signals.dataFlow!.reads!.join(", ");
    const writes = signals.dataFlow!.writes!.join(", ");
    proptestCases += `
        #[test]
        fn test_${snakeFn}_preserves_data_integrity(value in 0i32..1000) {
            // Conservation: data integrity across reads and writes
            // Reads: ${reads}
            // Writes: ${writes}
            let mut sut = create_test_instance();
            let total_before = sut.count();
            sut.${snakeFn}(value);
            let total_after = sut.count();
            prop_assert!(total_after >= total_before);
        }
`;
  }

  // Iterator pipeline property
  if (hasStreams || hasEnhancedFor) {
    const ops = streamOps.length > 0 ? streamOps.join(" -> ") : "iteration";
    proptestCases += `
        #[test]
        fn test_${snakeFn}_iterator_preserves_bounds(
            items in proptest::collection::vec(any::<i32>(), 0..50)
        ) {
            // Iterator ops: ${ops}
            let result = ${snakeFn}(&items);
            prop_assert!(result.len() <= items.len());
        }
`;
  }

  // Result-is-always-valid for high ISD
  if (isd >= 0.6) {
    proptestCases += `
        #[test]
        fn test_${snakeFn}_always_returns_valid(input in "\\\\PC{0,200}") {
            // High ISD (${isd.toFixed(2)}) implies robust error handling
            let result = std::panic::catch_unwind(|| ${snakeFn}(&input));
            prop_assert!(result.is_ok(), "Function should not panic on any valid input");
        }
`;
  }

  // Error handling: result type consistency
  if (catchBlocks > 0 && isd >= 0.4) {
    const types = caughtTypes.length > 0 ? caughtTypes.join(", ") : "general errors";
    regularTests += `
    #[test]
    fn test_${snakeFn}_error_handling_is_exhaustive() {
        // ${catchBlocks} error handling block(s) for: ${types}
        // Ensure the function does not panic on any expected error path
        let result = std::panic::catch_unwind(|| ${snakeFn}(Default::default()));
        assert!(result.is_ok(), "Function should handle errors without panicking");
    }
`;
  }

  // Transformation: type stability
  if (intent === "transformation") {
    proptestCases += `
        #[test]
        fn test_${snakeFn}_returns_consistent_type(input in any::<i32>()) {
            // Transformation should always succeed or return typed error
            let result = ${snakeFn}(input);
            prop_assert!(result.is_ok(), "Transformation should succeed for valid input");
        }
`;
  }

  if (!proptestCases && !regularTests) return [];

  let content = `//! Property-based tests for ${moduleName}::${fnName}.
//! Auto-generated from DSTI intent signals using proptest.
//!
//! ISD Score: ${isd.toFixed(2)}
//! Intent: ${intent ?? "unknown"}

#[cfg(test)]
mod ${snakeFn}_property_tests {
    use super::*;
    // use ${config.crateName}::${snakeModule}::${snakeFn};
`;

  if (proptestCases) {
    content += `    use proptest::prelude::*;

    proptest! {
${proptestCases}
    }
`;
  }

  if (regularTests) {
    content += `${regularTests}`;
  }

  content += `}
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "property",
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
