// @docspec:module {
//   id: "docspec-dsti-rust-mock-setup-template",
//   name: "Mock Setup Fixture Template (Rust/mockall)",
//   description: "Generates mockall mock trait definitions and test fixture helper functions based on DSTI dependency analysis. Creates mock_! macro invocations and builder-style test setup for each detected dependency.",
//   since: "3.0.0"
// }

import type { IntentMethod, DependencyInfo } from "@docspec/dsti-core";
import type { RustTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates Rust mockall fixtures from DSTI dependency signals"
 * @docspec:deterministic
 */
export function generateMockSetup(method: IntentMethod, config: RustTestGeneratorConfig): GeneratedTestFile[] {
  const { moduleName, fnName } = parseQualified(method.qualified);
  const snakeModule = camelToSnake(moduleName);
  const testFileName = `test_${snakeModule}_fixtures.rs`;

  const signals = method.intentSignals!;
  const deps = Array.isArray(signals.dependencies) ? signals.dependencies : [];

  let traitDefs = "";
  let mockImpls = "";
  let fixtureBuilder = "";
  let fieldNames: string[] = [];

  for (const dep of deps.slice(0, 10)) {
    const depName = typeof dep === "string" ? dep : dep.name ?? "unknown";
    const classification = typeof dep === "object" && "classification" in dep ? (dep as DependencyInfo).classification : "other";
    const simpleName = depName.split(".").pop() ?? depName.split("::").pop() ?? depName;
    const snakeName = camelToSnake(simpleName);
    const traitName = `${simpleName}Trait`;

    fieldNames.push(snakeName);

    const traitMethods = getTraitMethods(classification);

    traitDefs += `
/// Trait for ${simpleName} (${classification ?? "unknown"})
/// Replace with actual trait from your crate
#[cfg_attr(test, mockall::automock)]
pub trait ${traitName} {
${traitMethods}
}
`;

    mockImpls += `    ${snakeName}: Mock${traitName},\n`;
    fixtureBuilder += `            ${snakeName}: Mock${traitName}::new(),\n`;
  }

  const content = `//! Mock setup fixtures for ${moduleName} tests.
//! Auto-generated from DSTI dependency analysis.
//!
//! Dependencies detected: ${deps.length}

#[cfg(test)]
mod ${snakeModule}_fixtures {
    use super::*;
    use mockall::predicate::*;
    use mockall::mock;
${traitDefs}

    /// Test fixture containing all mocked dependencies for ${moduleName}.
    struct TestFixture {
${mockImpls}
    }

    impl TestFixture {
        /// Create a new fixture with default mock expectations.
        fn new() -> Self {
            Self {
${fixtureBuilder}
            }
        }

        /// Build the system under test from the mocked dependencies.
        /// Replace with actual constructor
        fn build_sut(&self) -> ${moduleName} {
            // ${moduleName}::new(${fieldNames.map(f => `&self.${f}`).join(", ")})
            unimplemented!("Wire mocked dependencies into ${moduleName}")
        }
    }

    #[test]
    fn test_fixture_can_be_constructed() {
        let fixture = TestFixture::new();
        // Verify the fixture builds without panicking
        // let _sut = fixture.build_sut();
    }
}
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "mock-setup",
  }];
}

function getTraitMethods(classification: string | undefined): string {
  switch (classification) {
    case "repository":
    case "database":
      return `    fn find_all(&self) -> Vec<()>;
    fn find_by_id(&self, id: u64) -> Option<()>;
    fn save(&self, entity: ()) -> Result<(), Box<dyn std::error::Error>>;
    fn delete(&self, id: u64) -> Result<(), Box<dyn std::error::Error>>;`;
    case "client":
      return `    fn get(&self, url: &str) -> Result<String, Box<dyn std::error::Error>>;
    fn post(&self, url: &str, body: &str) -> Result<String, Box<dyn std::error::Error>>;
    fn put(&self, url: &str, body: &str) -> Result<String, Box<dyn std::error::Error>>;
    fn delete(&self, url: &str) -> Result<(), Box<dyn std::error::Error>>;`;
    case "cache":
      return `    fn get(&self, key: &str) -> Option<String>;
    fn set(&self, key: &str, value: &str, ttl_secs: u64) -> Result<(), Box<dyn std::error::Error>>;
    fn del(&self, key: &str) -> Result<(), Box<dyn std::error::Error>>;`;
    case "message_broker":
      return `    fn publish(&self, topic: &str, payload: &[u8]) -> Result<(), Box<dyn std::error::Error>>;
    fn subscribe(&self, topic: &str) -> Result<(), Box<dyn std::error::Error>>;`;
    case "service":
    default:
      return `    // Define trait methods for this service dependency
    fn execute(&self) -> Result<(), Box<dyn std::error::Error>>;`;
  }
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
