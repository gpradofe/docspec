// @docspec:module {
//   id: "docspec-dsti-java-guard-tests-template",
//   name: "Guard Clause Test Template (Java/JUnit 5)",
//   description: "Generates JUnit 5 @Test methods for guard clause verification. Creates one assertThrows test per detected guard clause plus a null rejection test, all driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { JavaTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates JUnit 5 guard clause test stubs from DSTI intent signals"
 * @docspec:deterministic
 */
export function generateGuardTests(method: IntentMethod, config: JavaTestGeneratorConfig): GeneratedTestFile[] {
  const parts = method.qualified.split("#");
  const className = parts[0].split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  const testClassName = `${className}${capitalize(methodName)}GuardTest`;
  const packageName = config.basePackage ?? "io.docspec.generated";
  const packagePath = packageName.replace(/\./g, "/");

  const signals = method.intentSignals!;
  const guardCount = typeof signals.guardClauses === "number" ? signals.guardClauses : (Array.isArray(signals.guardClauses) ? signals.guardClauses.length : 0);

  let testMethods = "";
  for (let i = 0; i < guardCount; i++) {
    const guardInfo = Array.isArray(signals.guardClauses) ? signals.guardClauses[i] : null;
    const condition = guardInfo?.condition ?? `guard condition ${i + 1}`;
    const error = guardInfo?.error ?? "IllegalArgumentException";

    testMethods += `
    @Test
    @DisplayName("Should enforce guard: ${escapeJava(condition)}")
    void shouldEnforceGuard${i + 1}() {
        // Given: input that violates ${escapeJava(condition)}
        // When/Then: expect ${error}
        assertThrows(${error}.class, () -> {
            // TODO: Call ${methodName} with invalid input
        });
    }
`;
  }

  // Add null parameter tests
  const params = method.intentSignals?.nameSemantics?.object ? [method.intentSignals.nameSemantics.object] : [];
  testMethods += `
    @Test
    @DisplayName("Should reject null input")
    void shouldRejectNullInput() {
        assertThrows(NullPointerException.class, () -> {
            // TODO: Call ${methodName} with null
        });
    }
`;

  const content = `package ${packageName};

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Guard clause tests for ${className}#${methodName}.
 * Auto-generated from DSTI intent signals.
 */
@DisplayName("${className}#${methodName} — Guard Clauses")
class ${testClassName} {
${testMethods}
}
`;

  return [{
    path: `${config.outputDir}/${packagePath}/${testClassName}.java`,
    content,
    type: "guard",
  }];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeJava(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
