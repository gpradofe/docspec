// @docspec:module {
//   id: "docspec-dsti-dsl-assertion-mapper",
//   name: "DSL-to-Assertion Mapper",
//   description: "Maps parsed Property DSL expressions (from @DocInvariant rules) to assertion code in all 5 target languages: Java (AssertJ), TypeScript (Jest/Vitest), Python (pytest), Rust (proptest), and C# (xUnit/FluentAssertions). Supports SIZE, BETWEEN/RANGE, comparison, NOT_NULL, NOT_EMPTY, NOT_BLANK, IN, MATCHES, and monotonicity patterns.",
//   since: "3.0.0"
// }

import { PropertyDSLParser } from "./property-dsl-parser.js";
import type { InvariantRule } from "./property-dsl-parser.js";

/**
 * Assertion code for a single DSL expression in all 5 supported languages.
 *
 * @docspec:boundary "Cross-language assertion representation"
 */
export interface DslAssertion {
  javaAssertion: string;
  typescriptAssertion: string;
  pythonAssertion: string;
  rustAssertion: string;
  csharpAssertion: string;
}

// ---------------------------------------------------------------------------
// Field name helpers
// ---------------------------------------------------------------------------

/**
 * Converts a dotted field path to a Java getter chain.
 * "output.milestones" -> "result.getMilestones()"
 * "input.weeklyHours" -> "input.getWeeklyHours()"
 *
 * @docspec:deterministic
 */
function toJavaGetter(field: string): string {
  const parts = field.split(".");
  return parts
    .map((part, i) => {
      if (i === 0) {
        return part === "output" ? "result" : part;
      }
      return `get${part.charAt(0).toUpperCase()}${part.slice(1)}()`;
    })
    .join(".");
}

/**
 * Converts a dotted field path to a TypeScript property access.
 * "output.milestones" -> "result.milestones"
 *
 * @docspec:deterministic
 */
function toTSAccessor(field: string): string {
  const parts = field.split(".");
  if (parts[0] === "output") {
    parts[0] = "result";
  }
  return parts.join(".");
}

/**
 * Converts a dotted field path to a Python attribute access.
 * "output.milestones" -> "result.milestones"
 *
 * @docspec:deterministic
 */
function toPythonAccessor(field: string): string {
  const parts = field.split(".");
  if (parts[0] === "output") {
    parts[0] = "result";
  }
  return parts.join(".");
}

/**
 * Converts a dotted field path to a Rust field access.
 * "output.milestones" -> "result.milestones"
 *
 * @docspec:deterministic
 */
function toRustAccessor(field: string): string {
  const parts = field.split(".");
  if (parts[0] === "output") {
    parts[0] = "result";
  }
  return parts.join(".");
}

/**
 * Converts a dotted field path to a C# property access.
 * "output.milestones" -> "result.Milestones"
 *
 * @docspec:deterministic
 */
function toCSharpAccessor(field: string): string {
  const parts = field.split(".");
  return parts
    .map((part, i) => {
      if (i === 0) {
        return part === "output" ? "result" : part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(".");
}

// ---------------------------------------------------------------------------
// SIZE assertion mappers
// ---------------------------------------------------------------------------

function mapSizeJava(getter: string, op: string, value: string): string {
  const num = Number(value);
  if (op === ">" && num === 0) {
    return `assertThat(${getter}).isNotEmpty();`;
  }
  if (op === ">=" && num === 1) {
    return `assertThat(${getter}).isNotEmpty();`;
  }
  const assertOp = comparisonToAssertJMethod(op);
  return `assertThat(${getter}).hasSize${assertOp}(${value});`;
}

function mapSizeTS(accessor: string, op: string, value: string): string {
  const num = Number(value);
  if (op === ">" && num === 0) {
    return `expect(${accessor}.length).toBeGreaterThan(0);`;
  }
  return `expect(${accessor}.length)${tsComparison(op, value)};`;
}

function mapSizePython(accessor: string, op: string, value: string): string {
  const num = Number(value);
  if (op === ">" && num === 0) {
    return `assert len(${accessor}) > 0`;
  }
  return `assert len(${accessor}) ${op} ${value}`;
}

function mapSizeRust(accessor: string, op: string, value: string): string {
  const num = Number(value);
  if (op === ">" && num === 0) {
    return `assert!(!${accessor}.is_empty());`;
  }
  return `assert!(${accessor}.len() ${rustOp(op)} ${value});`;
}

function mapSizeCSharp(accessor: string, op: string, value: string): string {
  const num = Number(value);
  if (op === ">" && num === 0) {
    return `Assert.NotEmpty(${accessor});`;
  }
  const cond = csharpComparison(`${accessor}.Count`, op, value);
  return `Assert.True(${cond});`;
}

// ---------------------------------------------------------------------------
// BETWEEN assertion mappers
// ---------------------------------------------------------------------------

function mapBetweenJava(getter: string, min: string, max: string): string {
  return `assertThat(${getter}).isBetween(${min}, ${max});`;
}

function mapBetweenTS(accessor: string, min: string, max: string): string {
  return `expect(${accessor}).toBeGreaterThanOrEqual(${min});\nexpect(${accessor}).toBeLessThanOrEqual(${max});`;
}

function mapBetweenPython(accessor: string, min: string, max: string): string {
  return `assert ${min} <= ${accessor} <= ${max}`;
}

function mapBetweenRust(accessor: string, min: string, max: string): string {
  return `assert!((${min}..=${max}).contains(&${accessor}));`;
}

function mapBetweenCSharp(accessor: string, min: string, max: string): string {
  return `Assert.InRange(${accessor}, ${min}, ${max});`;
}

// ---------------------------------------------------------------------------
// Comparison assertion mappers
// ---------------------------------------------------------------------------

function mapComparisonJava(getter: string, op: string, value: string): string {
  switch (op) {
    case "GT":
      return isZero(value)
        ? `assertThat(${getter}).isPositive();`
        : `assertThat(${getter}).isGreaterThan(${value});`;
    case "GTE":
      return isZero(value)
        ? `assertThat(${getter}).isGreaterThanOrEqualTo(${value});`
        : `assertThat(${getter}).isGreaterThanOrEqualTo(${value});`;
    case "LT":
      return `assertThat(${getter}).isLessThan(${value});`;
    case "LTE":
      return `assertThat(${getter}).isLessThanOrEqualTo(${value});`;
    case "EQ":
      return `assertThat(${getter}).isEqualTo(${wrapJavaValue(value)});`;
    case "NEQ":
      return `assertThat(${getter}).isNotEqualTo(${wrapJavaValue(value)});`;
    default:
      return `assertThat(${getter}).isEqualTo(${wrapJavaValue(value)});`;
  }
}

function mapComparisonTS(accessor: string, op: string, value: string): string {
  switch (op) {
    case "GT":
      return `expect(${accessor}).toBeGreaterThan(${value});`;
    case "GTE":
      return `expect(${accessor}).toBeGreaterThanOrEqual(${value});`;
    case "LT":
      return `expect(${accessor}).toBeLessThan(${value});`;
    case "LTE":
      return `expect(${accessor}).toBeLessThanOrEqual(${value});`;
    case "EQ":
      return `expect(${accessor}).toBe(${wrapTSValue(value)});`;
    case "NEQ":
      return `expect(${accessor}).not.toBe(${wrapTSValue(value)});`;
    default:
      return `expect(${accessor}).toBe(${wrapTSValue(value)});`;
  }
}

function mapComparisonPython(accessor: string, op: string, value: string): string {
  const pyOp = pythonOp(op);
  return `assert ${accessor} ${pyOp} ${value}`;
}

function mapComparisonRust(accessor: string, op: string, value: string): string {
  const rOp = rustComparisonOp(op);
  return `assert!(${accessor} ${rOp} ${value});`;
}

function mapComparisonCSharp(accessor: string, op: string, value: string): string {
  switch (op) {
    case "GT":
      return `Assert.True(${accessor} > ${value});`;
    case "GTE":
      return `Assert.True(${accessor} >= ${value});`;
    case "LT":
      return `Assert.True(${accessor} < ${value});`;
    case "LTE":
      return `Assert.True(${accessor} <= ${value});`;
    case "EQ":
      return `Assert.Equal(${wrapCSharpValue(value)}, ${accessor});`;
    case "NEQ":
      return `Assert.NotEqual(${wrapCSharpValue(value)}, ${accessor});`;
    default:
      return `Assert.Equal(${wrapCSharpValue(value)}, ${accessor});`;
  }
}

// ---------------------------------------------------------------------------
// NOT_NULL assertion mappers
// ---------------------------------------------------------------------------

function mapNotNullJava(getter: string): string {
  return `assertThat(${getter}).isNotNull();`;
}

function mapNotNullTS(accessor: string): string {
  return `expect(${accessor}).not.toBeNull();`;
}

function mapNotNullPython(accessor: string): string {
  return `assert ${accessor} is not None`;
}

function mapNotNullRust(accessor: string): string {
  return `assert!(${accessor}.is_some());`;
}

function mapNotNullCSharp(accessor: string): string {
  return `Assert.NotNull(${accessor});`;
}

// ---------------------------------------------------------------------------
// NOT_EMPTY assertion mappers
// ---------------------------------------------------------------------------

function mapNotEmptyJava(getter: string): string {
  return `assertThat(${getter}).isNotEmpty();`;
}

function mapNotEmptyTS(accessor: string): string {
  return `expect(${accessor}.length).toBeGreaterThan(0);`;
}

function mapNotEmptyPython(accessor: string): string {
  return `assert len(${accessor}) > 0`;
}

function mapNotEmptyRust(accessor: string): string {
  return `assert!(!${accessor}.is_empty());`;
}

function mapNotEmptyCSharp(accessor: string): string {
  return `Assert.NotEmpty(${accessor});`;
}

// ---------------------------------------------------------------------------
// NOT_BLANK assertion mappers
// ---------------------------------------------------------------------------

function mapNotBlankJava(getter: string): string {
  return `assertThat(${getter}).isNotBlank();`;
}

function mapNotBlankTS(accessor: string): string {
  return `expect(${accessor}.trim().length).toBeGreaterThan(0);`;
}

function mapNotBlankPython(accessor: string): string {
  return `assert ${accessor} is not None and ${accessor}.strip() != ""`;
}

function mapNotBlankRust(accessor: string): string {
  return `assert!(!${accessor}.trim().is_empty());`;
}

function mapNotBlankCSharp(accessor: string): string {
  return `Assert.False(string.IsNullOrWhiteSpace(${accessor}));`;
}

// ---------------------------------------------------------------------------
// IN assertion mappers
// ---------------------------------------------------------------------------

function mapInJava(getter: string, values: string[]): string {
  const valList = values.map(wrapJavaValue).join(", ");
  return `assertThat(${getter}).isIn(${valList});`;
}

function mapInTS(accessor: string, values: string[]): string {
  const valList = values.map(wrapTSValue).join(", ");
  return `expect([${valList}]).toContain(${accessor});`;
}

function mapInPython(accessor: string, values: string[]): string {
  const valList = values.map(wrapPythonValue).join(", ");
  return `assert ${accessor} in [${valList}]`;
}

function mapInRust(accessor: string, values: string[]): string {
  const conditions = values.map((v) => `${accessor} == ${wrapRustValue(v)}`).join(" || ");
  return `assert!(${conditions});`;
}

function mapInCSharp(accessor: string, values: string[]): string {
  const valList = values.map(wrapCSharpValue).join(", ");
  return `Assert.Contains(${accessor}, new[] { ${valList} });`;
}

// ---------------------------------------------------------------------------
// MATCHES assertion mappers
// ---------------------------------------------------------------------------

function mapMatchesJava(getter: string, pattern: string): string {
  return `assertThat(${getter}).matches("${escapeJavaString(pattern)}");`;
}

function mapMatchesTS(accessor: string, pattern: string): string {
  return `expect(${accessor}).toMatch(/${pattern}/);`;
}

function mapMatchesPython(accessor: string, pattern: string): string {
  return `assert re.match(r"${pattern}", ${accessor})`;
}

function mapMatchesRust(accessor: string, pattern: string): string {
  return `assert!(regex::Regex::new(r"${pattern}").unwrap().is_match(&${accessor}));`;
}

function mapMatchesCSharp(accessor: string, pattern: string): string {
  return `Assert.Matches(@"${pattern}", ${accessor});`;
}

// ---------------------------------------------------------------------------
// Monotonicity mappers (input UP -> output DOWN, etc.)
// ---------------------------------------------------------------------------

const MONOTONICITY_RE = /^(.+)\s+(UP|DOWN)\s*[→->]+\s*(.+)\s+(UP|DOWN)$/;

function parseMonotonicity(expression: string): {
  inputField: string;
  inputDir: string;
  outputField: string;
  outputDir: string;
} | null {
  const m = expression.match(MONOTONICITY_RE);
  if (!m) return null;
  return {
    inputField: m[1].trim(),
    inputDir: m[2],
    outputField: m[3].trim(),
    outputDir: m[4],
  };
}

function mapMonotonicityJava(
  inputField: string, inputDir: string, outputField: string, outputDir: string,
): string {
  const inputGetter = toJavaGetter(inputField);
  const outputGetter = toJavaGetter(outputField);
  const cmp = outputDir === "UP" ? "isGreaterThanOrEqualTo" : "isLessThanOrEqualTo";
  return [
    `// Monotonicity: when ${inputField} goes ${inputDir}, ${outputField} goes ${outputDir}`,
    `var baseline = ${outputGetter};`,
    `// Increase ${inputField} and verify ${outputField} moves ${outputDir}`,
    `assertThat(${outputGetter}).${cmp}(baseline);`,
  ].join("\n");
}

function mapMonotonicityTS(
  inputField: string, inputDir: string, outputField: string, outputDir: string,
): string {
  const inputAcc = toTSAccessor(inputField);
  const outputAcc = toTSAccessor(outputField);
  const cmp = outputDir === "UP" ? "toBeGreaterThanOrEqual" : "toBeLessThanOrEqual";
  return [
    `// Monotonicity: when ${inputField} goes ${inputDir}, ${outputField} goes ${outputDir}`,
    `const baseline = ${outputAcc};`,
    `// Increase ${inputField} and verify ${outputField} moves ${outputDir}`,
    `expect(${outputAcc}).${cmp}(baseline);`,
  ].join("\n");
}

function mapMonotonicityPython(
  inputField: string, inputDir: string, outputField: string, outputDir: string,
): string {
  const inputAcc = toPythonAccessor(inputField);
  const outputAcc = toPythonAccessor(outputField);
  const cmp = outputDir === "UP" ? ">=" : "<=";
  return [
    `# Monotonicity: when ${inputField} goes ${inputDir}, ${outputField} goes ${outputDir}`,
    `baseline = ${outputAcc}`,
    `# Increase ${inputField} and verify ${outputField} moves ${outputDir}`,
    `assert ${outputAcc} ${cmp} baseline`,
  ].join("\n");
}

function mapMonotonicityRust(
  inputField: string, inputDir: string, outputField: string, outputDir: string,
): string {
  const inputAcc = toRustAccessor(inputField);
  const outputAcc = toRustAccessor(outputField);
  const cmp = outputDir === "UP" ? ">=" : "<=";
  return [
    `// Monotonicity: when ${inputField} goes ${inputDir}, ${outputField} goes ${outputDir}`,
    `let baseline = ${outputAcc};`,
    `// Increase ${inputField} and verify ${outputField} moves ${outputDir}`,
    `assert!(${outputAcc} ${cmp} baseline);`,
  ].join("\n");
}

function mapMonotonicityCSharp(
  inputField: string, inputDir: string, outputField: string, outputDir: string,
): string {
  const inputAcc = toCSharpAccessor(inputField);
  const outputAcc = toCSharpAccessor(outputField);
  const cmp = outputDir === "UP" ? ">=" : "<=";
  return [
    `// Monotonicity: when ${inputField} goes ${inputDir}, ${outputField} goes ${outputDir}`,
    `var baseline = ${outputAcc};`,
    `// Increase ${inputField} and verify ${outputField} moves ${outputDir}`,
    `Assert.True(${outputAcc} ${cmp} baseline);`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// RANGE shorthand (min..max) — treated as BETWEEN
// ---------------------------------------------------------------------------

const RANGE_RE = /^(.+)\s+RANGE\s+(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/i;

function parseRange(expression: string): {
  field: string;
  min: string;
  max: string;
} | null {
  const m = expression.match(RANGE_RE);
  if (!m) return null;
  return { field: m[1].trim(), min: m[2], max: m[3] };
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function isZero(value: string): boolean {
  return Number(value) === 0;
}

function isNumeric(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function comparisonToAssertJMethod(op: string): string {
  switch (op) {
    case ">": return "GreaterThan";
    case ">=": return "GreaterThanOrEqualTo";
    case "<": return "LessThan";
    case "<=": return "LessThanOrEqualTo";
    case "==": return "";
    case "!=": return "NotEqualTo";
    default: return "";
  }
}

function tsComparison(op: string, value: string): string {
  switch (op) {
    case ">": return `.toBeGreaterThan(${value})`;
    case ">=": return `.toBeGreaterThanOrEqual(${value})`;
    case "<": return `.toBeLessThan(${value})`;
    case "<=": return `.toBeLessThanOrEqual(${value})`;
    case "==": return `.toBe(${value})`;
    case "!=": return `.not.toBe(${value})`;
    default: return `.toBe(${value})`;
  }
}

function pythonOp(op: string): string {
  switch (op) {
    case "GT": return ">";
    case "GTE": return ">=";
    case "LT": return "<";
    case "LTE": return "<=";
    case "EQ": return "==";
    case "NEQ": return "!=";
    default: return "==";
  }
}

function rustOp(op: string): string {
  switch (op) {
    case ">": return ">";
    case ">=": return ">=";
    case "<": return "<";
    case "<=": return "<=";
    case "==": return "==";
    case "!=": return "!=";
    default: return "==";
  }
}

function rustComparisonOp(op: string): string {
  switch (op) {
    case "GT": return ">";
    case "GTE": return ">=";
    case "LT": return "<";
    case "LTE": return "<=";
    case "EQ": return "==";
    case "NEQ": return "!=";
    default: return "==";
  }
}

function csharpComparison(accessor: string, op: string, value: string): string {
  const csOp = op === "==" ? "==" : op === "!=" ? "!=" : op;
  return `${accessor} ${csOp} ${value}`;
}

function wrapJavaValue(value: string): string {
  if (isNumeric(value)) return value;
  return `"${escapeJavaString(value)}"`;
}

function wrapTSValue(value: string): string {
  if (isNumeric(value)) return value;
  return `"${value}"`;
}

function wrapPythonValue(value: string): string {
  if (isNumeric(value)) return value;
  return `"${value}"`;
}

function wrapRustValue(value: string): string {
  if (isNumeric(value)) return value;
  return `"${value}"`;
}

function wrapCSharpValue(value: string): string {
  if (isNumeric(value)) return value;
  return `"${value}"`;
}

function escapeJavaString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

/**
 * Maps a Property DSL expression string to assertion code in all 5 target languages.
 *
 * Supported patterns:
 * - NOT_NULL, NOT_EMPTY, NOT_BLANK
 * - SIZE with comparison (e.g. "items SIZE > 0")
 * - BETWEEN / RANGE (e.g. "age BETWEEN 1 AND 100", "hours RANGE 1..40")
 * - IN (e.g. "status IN [ACTIVE, PENDING]")
 * - MATCHES (e.g. "email MATCHES '^[\\w.]+@[\\w.]+$'")
 * - Comparisons: >, >=, <, <=, ==, != (e.g. "balance > 0")
 * - Monotonicity: "input UP -> output DOWN"
 * - Custom fallback as comments
 *
 * @docspec:deterministic
 * @docspec:intentional "Converts a DSL rule expression into executable assertions for Java, TypeScript, Python, Rust, and C#"
 */
export function mapDslToAssertions(expression: string): DslAssertion {
  if (!expression?.trim()) {
    return defaultAssertion(expression);
  }

  const trimmed = expression.trim();

  // 1. Check for RANGE shorthand (min..max) before parsing with PropertyDSLParser
  const rangeResult = parseRange(trimmed);
  if (rangeResult) {
    const { field, min, max } = rangeResult;
    return {
      javaAssertion: mapBetweenJava(toJavaGetter(field), min, max),
      typescriptAssertion: mapBetweenTS(toTSAccessor(field), min, max),
      pythonAssertion: mapBetweenPython(toPythonAccessor(field), min, max),
      rustAssertion: mapBetweenRust(toRustAccessor(field), min, max),
      csharpAssertion: mapBetweenCSharp(toCSharpAccessor(field), min, max),
    };
  }

  // 2. Check for monotonicity pattern: "field UP -> field DOWN"
  const monoResult = parseMonotonicity(trimmed);
  if (monoResult) {
    const { inputField, inputDir, outputField, outputDir } = monoResult;
    return {
      javaAssertion: mapMonotonicityJava(inputField, inputDir, outputField, outputDir),
      typescriptAssertion: mapMonotonicityTS(inputField, inputDir, outputField, outputDir),
      pythonAssertion: mapMonotonicityPython(inputField, inputDir, outputField, outputDir),
      rustAssertion: mapMonotonicityRust(inputField, inputDir, outputField, outputDir),
      csharpAssertion: mapMonotonicityCSharp(inputField, inputDir, outputField, outputDir),
    };
  }

  // 3. Parse with the existing PropertyDSLParser
  const rule = PropertyDSLParser.parse(trimmed);
  if (!rule) {
    return defaultAssertion(trimmed);
  }

  return mapRuleToAssertions(rule);
}

/**
 * Maps a parsed InvariantRule to assertions for all 5 languages.
 *
 * @docspec:deterministic
 */
export function mapRuleToAssertions(rule: InvariantRule): DslAssertion {
  const field = rule.field;
  const javaGetter = toJavaGetter(field);
  const tsAccessor = toTSAccessor(field);
  const pyAccessor = toPythonAccessor(field);
  const rsAccessor = toRustAccessor(field);
  const csAccessor = toCSharpAccessor(field);

  switch (rule.operator) {
    case "NOT_NULL":
      return {
        javaAssertion: mapNotNullJava(javaGetter),
        typescriptAssertion: mapNotNullTS(tsAccessor),
        pythonAssertion: mapNotNullPython(pyAccessor),
        rustAssertion: mapNotNullRust(rsAccessor),
        csharpAssertion: mapNotNullCSharp(csAccessor),
      };

    case "NOT_EMPTY":
      return {
        javaAssertion: mapNotEmptyJava(javaGetter),
        typescriptAssertion: mapNotEmptyTS(tsAccessor),
        pythonAssertion: mapNotEmptyPython(pyAccessor),
        rustAssertion: mapNotEmptyRust(rsAccessor),
        csharpAssertion: mapNotEmptyCSharp(csAccessor),
      };

    case "NOT_BLANK":
      return {
        javaAssertion: mapNotBlankJava(javaGetter),
        typescriptAssertion: mapNotBlankTS(tsAccessor),
        pythonAssertion: mapNotBlankPython(pyAccessor),
        rustAssertion: mapNotBlankRust(rsAccessor),
        csharpAssertion: mapNotBlankCSharp(csAccessor),
      };

    case "SIZE":
      return {
        javaAssertion: mapSizeJava(javaGetter, rule.sizeOperator!, rule.value!),
        typescriptAssertion: mapSizeTS(tsAccessor, rule.sizeOperator!, rule.value!),
        pythonAssertion: mapSizePython(pyAccessor, rule.sizeOperator!, rule.value!),
        rustAssertion: mapSizeRust(rsAccessor, rule.sizeOperator!, rule.value!),
        csharpAssertion: mapSizeCSharp(csAccessor, rule.sizeOperator!, rule.value!),
      };

    case "IN":
      return {
        javaAssertion: mapInJava(javaGetter, rule.values!),
        typescriptAssertion: mapInTS(tsAccessor, rule.values!),
        pythonAssertion: mapInPython(pyAccessor, rule.values!),
        rustAssertion: mapInRust(rsAccessor, rule.values!),
        csharpAssertion: mapInCSharp(csAccessor, rule.values!),
      };

    case "BETWEEN":
      return {
        javaAssertion: mapBetweenJava(javaGetter, rule.minValue!, rule.maxValue!),
        typescriptAssertion: mapBetweenTS(tsAccessor, rule.minValue!, rule.maxValue!),
        pythonAssertion: mapBetweenPython(pyAccessor, rule.minValue!, rule.maxValue!),
        rustAssertion: mapBetweenRust(rsAccessor, rule.minValue!, rule.maxValue!),
        csharpAssertion: mapBetweenCSharp(csAccessor, rule.minValue!, rule.maxValue!),
      };

    case "MATCHES":
      return {
        javaAssertion: mapMatchesJava(javaGetter, rule.value!),
        typescriptAssertion: mapMatchesTS(tsAccessor, rule.value!),
        pythonAssertion: mapMatchesPython(pyAccessor, rule.value!),
        rustAssertion: mapMatchesRust(rsAccessor, rule.value!),
        csharpAssertion: mapMatchesCSharp(csAccessor, rule.value!),
      };

    case "GT":
    case "GTE":
    case "LT":
    case "LTE":
    case "EQ":
    case "NEQ":
      return {
        javaAssertion: mapComparisonJava(javaGetter, rule.operator, rule.value!),
        typescriptAssertion: mapComparisonTS(tsAccessor, rule.operator, rule.value!),
        pythonAssertion: mapComparisonPython(pyAccessor, rule.operator, rule.value!),
        rustAssertion: mapComparisonRust(rsAccessor, rule.operator, rule.value!),
        csharpAssertion: mapComparisonCSharp(csAccessor, rule.operator, rule.value!),
      };

    case "CUSTOM":
    default:
      return defaultAssertion(`${rule.field} ${rule.value ?? rule.operator}`);
  }
}

/**
 * Maps multiple DSL expressions to assertions.
 *
 * @docspec:deterministic
 */
export function mapAllDslToAssertions(expressions: string[]): DslAssertion[] {
  if (!expressions) return [];
  return expressions.map(mapDslToAssertions);
}

function defaultAssertion(expression: string): DslAssertion {
  return {
    javaAssertion: `// Property: ${expression}`,
    typescriptAssertion: `// Property: ${expression}`,
    pythonAssertion: `# Property: ${expression}`,
    rustAssertion: `// Property: ${expression}`,
    csharpAssertion: `// Property: ${expression}`,
  };
}
