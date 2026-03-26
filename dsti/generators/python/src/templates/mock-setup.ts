// @docspec:module {
//   id: "docspec-dsti-python-mock-setup-template",
//   name: "Mock Setup Fixture Template (Python/pytest-mock)",
//   description: "Generates pytest fixtures with unittest.mock.MagicMock or pytest-mock mocker setup based on DSTI dependency analysis. Creates conftest.py-style fixtures with classified mock objects.",
//   since: "3.0.0"
// }

import type { IntentMethod, DependencyInfo } from "@docspec/dsti-core";
import type { PythonTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates pytest mock fixtures from DSTI dependency signals"
 * @docspec:deterministic
 */
export function generateMockSetup(method: IntentMethod, config: PythonTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName, modulePath } = parseQualified(method.qualified);
  const snakeClass = camelToSnake(className);
  const testFileName = `conftest_${snakeClass}.py`;

  const signals = method.intentSignals!;
  const deps = Array.isArray(signals.dependencies) ? signals.dependencies : [];

  let fixtures = "";
  let fixtureNames: string[] = [];

  for (const dep of deps.slice(0, 10)) {
    const depName = typeof dep === "string" ? dep : dep.name ?? "unknown";
    const classification = typeof dep === "object" && "classification" in dep ? (dep as DependencyInfo).classification : "other";
    const simpleName = depName.split(".").pop() ?? depName;
    const snakeName = camelToSnake(simpleName);

    fixtureNames.push(snakeName);

    const mockSetup = getMockSetup(classification, snakeName);

    fixtures += `
@pytest.fixture
def ${snakeName}():
    """Mock for ${simpleName} (${classification ?? "unknown"})."""
    mock = MagicMock(spec=${simpleName})
${mockSetup}
    return mock

`;
  }

  // Generate the main instance fixture that combines all mocks
  const fixtureParams = fixtureNames.join(", ");
  fixtures += `
@pytest.fixture
def instance(${fixtureParams}):
    """Create a ${className} instance with all mocked dependencies."""
    # TODO: Initialize with mocked dependencies
    # return ${className}(${fixtureParams})
    pass
`;

  const content = `"""
Mock setup fixtures for ${className} tests.
Auto-generated from DSTI dependency analysis.

Dependencies detected: ${deps.length}
"""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
# from ${modulePath} import ${className}
${deps.slice(0, 10).map(d => {
  const name = typeof d === "string" ? d : d.name ?? "unknown";
  const simple = name.split(".").pop() ?? name;
  const modPath = name.split(".").slice(0, -1).join(".");
  return modPath ? `# from ${modPath} import ${simple}` : `# import ${simple}`;
}).join("\n")}

${fixtures}
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "mock-setup",
  }];
}

function getMockSetup(classification: string | undefined, varName: string): string {
  switch (classification) {
    case "repository":
    case "database":
      return `    mock.find_all.return_value = []
    mock.find_by_id.return_value = None
    mock.save.return_value = MagicMock()
    mock.delete.return_value = None`;
    case "client":
      return `    mock.get.return_value = MagicMock(status_code=200, json=lambda: {})
    mock.post.return_value = MagicMock(status_code=201, json=lambda: {})
    mock.put.return_value = MagicMock(status_code=200, json=lambda: {})
    mock.delete.return_value = MagicMock(status_code=204)`;
    case "cache":
      return `    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = True`;
    case "message_broker":
      return `    mock.publish = AsyncMock(return_value=None)
    mock.subscribe = AsyncMock(return_value=None)`;
    case "service":
    default:
      return `    # TODO: Configure mock methods for ${varName}`;
  }
}

function parseQualified(qualified: string): { className: string; methodName: string; modulePath: string } {
  const parts = qualified.split("#");
  const fullClass = parts[0];
  const className = fullClass.split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  const modulePath = fullClass.split(".").slice(0, -1).join(".");
  return { className, methodName, modulePath };
}

function camelToSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}
