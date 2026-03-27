// @docspec:module {
//   id: "docspec-dsti-java-guard-tests-template",
//   name: "Guard Clause Test Template (Java/JUnit 5)",
//   description: "Generates JUnit 5 @Test methods for guard clause verification. Creates one assertThrows test per detected guard clause plus a null rejection test, all driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { JavaTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * Derives a representative invalid input value from a guard condition string.
 * Parses common patterns like null checks, range violations, and emptiness tests.
 */
function deriveInvalidInput(condition: string, _methodName: string): string {
  // "param == null" or "param is null" → pass null
  if (/==\s*null|is\s+null/i.test(condition)) {
    return "null";
  }
  // "x < 0" or "x <= 0" → pass -1
  if (/<\s*0|<=\s*0/.test(condition)) {
    return "-1";
  }
  // "x > N" → pass N+1
  if (/>\s*\d+/.test(condition)) {
    const match = condition.match(/>\s*(\d+)/);
    return match ? String(parseInt(match[1]) + 1) : "Integer.MAX_VALUE";
  }
  // "x < N" (but not < 0) → pass N-1 (below the minimum)
  if (/<\s*\d+/.test(condition)) {
    const match = condition.match(/<\s*(\d+)/);
    return match ? String(parseInt(match[1]) - 1) : "-1";
  }
  // isEmpty / isBlank / length == 0
  if (/isEmpty|isBlank|\.length\s*==\s*0/.test(condition)) {
    return '""';
  }
  // Default: null is a reasonable invalid input for most guard clauses
  return "null";
}

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

    const invalidInput = deriveInvalidInput(condition, methodName);
    testMethods += `
    @Test
    @DisplayName("Should enforce guard: ${escapeJava(condition)}")
    void shouldEnforceGuard${i + 1}() {
        // Given: input that violates ${escapeJava(condition)}
        // When/Then: expect ${error}
        assertThrows(${error}.class, () -> {
            sut.${methodName}(${invalidInput});
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
            sut.${methodName}(null);
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
