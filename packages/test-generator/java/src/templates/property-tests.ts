// @docspec:module {
//   id: "docspec-dsti-java-property-tests-template",
//   name: "Property-Based Test Template (Java/jqwik)",
//   description: "Generates jqwik @Property test methods driven by DSTI intent signals. Creates idempotency tests for queries, state-change tests for mutations, and data conservation tests when both reads and writes are detected.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import { mapDslToAssertions } from "@docspec/dsti-core";
import type { JavaTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates jqwik property-based test stubs using intent-driven templates"
 * @docspec:deterministic
 */
export function generatePropertyTests(method: IntentMethod, config: JavaTestGeneratorConfig): GeneratedTestFile[] {
  const parts = method.qualified.split("#");
  const className = parts[0].split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  const testClassName = `${className}${capitalize(methodName)}PropertyTest`;
  const packageName = config.basePackage ?? "io.docspec.generated";
  const packagePath = packageName.replace(/\./g, "/");

  const signals = method.intentSignals!;
  let testMethods = "";

  // Generate idempotency property test
  const intent = signals.nameSemantics?.intent;
  if (intent === "query") {
    testMethods += `
    @Property
    void queryIsIdempotent(@ForAll @StringLength(max = 100) String input) {
        var result1 = sut.${methodName}(input);
        var result2 = sut.${methodName}(input);
        assertThat(result1).isEqualTo(result2);
    }
`;
  }

  // Generate monotonicity property test
  if (intent === "creation" || intent === "mutation") {
    testMethods += `
    @Property
    void mutationChangesState(@ForAll @StringLength(max = 100) String input) {
        var stateBefore = sut.hashCode();
        sut.${methodName}(input);
        var stateAfter = sut.hashCode();
        assertThat(stateAfter).isNotEqualTo(stateBefore);
    }
`;
  }

  // Generate conservation property test
  if (signals.dataFlow?.reads?.length && signals.dataFlow?.writes?.length) {
    testMethods += `
    @Property
    void conservesDataIntegrity(@ForAll @IntRange(min = 0, max = 1000) int value) {
        long totalBefore = sut.count();
        sut.${methodName}(value);
        long totalAfter = sut.count();
        assertThat(totalAfter).isGreaterThanOrEqualTo(totalBefore);
    }
`;
  }

  // Generate invariant rule tests from @DocInvariant Property DSL expressions
  if (signals.invariantRules) {
    for (const rule of signals.invariantRules) {
      const assertions = mapDslToAssertions(rule);
      const safeRuleName = rule.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
      testMethods += `
    @Property
    void invariant_${safeRuleName}(@ForAll @StringLength(max = 100) String input) {
        var result = sut.${methodName}(input);
        ${assertions.javaAssertion}
    }
`;
    }
  }

  if (!testMethods) return [];

  const content = `package ${packageName};

import net.jqwik.api.*;
import net.jqwik.api.constraints.*;
import static org.assertj.core.api.Assertions.*;

/**
 * Property-based tests for ${className}#${methodName}.
 * Auto-generated from DSTI intent signals using jqwik.
 */
class ${testClassName} {
${testMethods}
}
`;

  return [{
    path: `${config.outputDir}/${packagePath}/${testClassName}.java`,
    content,
    type: "property",
  }];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
