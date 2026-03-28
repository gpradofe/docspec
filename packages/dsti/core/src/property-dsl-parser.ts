// @docspec:module {
//   id: "docspec-dsti-property-dsl-parser",
//   name: "DSTI Property DSL Parser",
//   description: "Parses @DocInvariant rule expressions (e.g., 'balance >= 0', 'name NOT_BLANK', 'status IN [ACTIVE, INACTIVE]') into structured InvariantRule objects. Supports NOT_NULL, NOT_EMPTY, NOT_BLANK, SIZE, IN, BETWEEN, MATCHES, and comparison operators. Port of the Java PropertyDSL.",
//   since: "3.0.0"
// }

/**
 * TypeScript port of Java PropertyDSL.java.
 *
 * Parses @DocInvariant rule expressions into structured InvariantRule objects.
 *
 * @docspec:deterministic
 * @docspec:intentional "Converts human-readable invariant rules into structured AST-like objects"
 *
 * Supported syntax:
 * - "field NOT_NULL"            -- field must not be null
 * - "field NOT_EMPTY"           -- string/collection must not be empty
 * - "field NOT_BLANK"           -- string must not be blank
 * - "field SIZE > 0"            -- collection/array size check
 * - "field IN [val1, val2]"     -- value must be one of the listed values
 * - "field BETWEEN 1 AND 100"   -- numeric range check
 * - "field MATCHES pattern"     -- regex pattern check
 * - "field > 0" / ">=" / "<" / "<=" / "==" / "!=" -- comparison operators
 */

export interface InvariantRule {
  field: string;
  /** One of: NOT_NULL, NOT_EMPTY, NOT_BLANK, SIZE, IN, BETWEEN, MATCHES, GT, GTE, LT, LTE, EQ, NEQ, CUSTOM */
  operator: string;
  /** For simple comparisons and MATCHES */
  value?: string;
  /** For IN operator */
  values?: string[];
  /** For BETWEEN (lower bound, inclusive) */
  minValue?: string;
  /** For BETWEEN (upper bound, inclusive) */
  maxValue?: string;
  /** For SIZE: the comparison operator applied to the size (e.g. ">", ">=") */
  sizeOperator?: string;
}

// Regex patterns (compiled once, same as Java PropertyDSL.java)
const NOT_NULL_RE = /^(\S+)\s+NOT_NULL$/i;
const NOT_EMPTY_RE = /^(\S+)\s+NOT_EMPTY$/i;
const NOT_BLANK_RE = /^(\S+)\s+NOT_BLANK$/i;
const SIZE_RE = /^(\S+)\s+SIZE\s*(>=?|<=?|==|!=)\s*(-?\d+(?:\.\d+)?)$/i;
const IN_RE = /^(\S+)\s+IN\s*\[(.+)]$/i;
const BETWEEN_RE =
  /^(\S+)\s+BETWEEN\s+(-?\d+(?:\.\d+)?)\s+AND\s+(-?\d+(?:\.\d+)?)$/i;
const MATCHES_RE = /^(\S+)\s+MATCHES\s+(.+)$/i;
const COMPARISON_RE = /^(\S+)\s*(>=|<=|!=|==|>|<)\s*(.+)$/;

/**
 * Strips surrounding single or double quotes from a string, if present.
 */
function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/** Maps symbolic comparison operators to named operator strings. */
const COMPARISON_OP_MAP: Record<string, string> = {
  ">": "GT",
  ">=": "GTE",
  "<": "LT",
  "<=": "LTE",
  "==": "EQ",
  "!=": "NEQ",
};

export class PropertyDSLParser {
  /**
   * Parse a single rule expression string into an InvariantRule.
   *
   * @param expression the rule expression (e.g. "balance >= 0")
   * @returns the parsed rule, or null if the expression cannot be parsed
   */
  static parse(expression: string): InvariantRule | null {
    if (!expression?.trim()) return null;
    const trimmed = expression.trim();

    let m: RegExpMatchArray | null;

    // 1. NOT_NULL
    m = trimmed.match(NOT_NULL_RE);
    if (m) {
      return { field: m[1], operator: "NOT_NULL" };
    }

    // 2. NOT_EMPTY
    m = trimmed.match(NOT_EMPTY_RE);
    if (m) {
      return { field: m[1], operator: "NOT_EMPTY" };
    }

    // 3. NOT_BLANK
    m = trimmed.match(NOT_BLANK_RE);
    if (m) {
      return { field: m[1], operator: "NOT_BLANK" };
    }

    // 4. SIZE comparison (must be tried before plain comparison)
    m = trimmed.match(SIZE_RE);
    if (m) {
      return {
        field: m[1],
        operator: "SIZE",
        sizeOperator: m[2],
        value: m[3],
      };
    }

    // 5. IN [values]
    m = trimmed.match(IN_RE);
    if (m) {
      const values = m[2]
        .split(",")
        .map((v) => stripQuotes(v.trim()))
        .filter(Boolean);
      return { field: m[1], operator: "IN", values };
    }

    // 6. BETWEEN x AND y
    m = trimmed.match(BETWEEN_RE);
    if (m) {
      return {
        field: m[1],
        operator: "BETWEEN",
        minValue: m[2],
        maxValue: m[3],
      };
    }

    // 7. MATCHES pattern
    m = trimmed.match(MATCHES_RE);
    if (m) {
      const pattern = stripQuotes(m[2].trim());
      return { field: m[1], operator: "MATCHES", value: pattern };
    }

    // 8. Comparison operators: >=, <=, !=, ==, >, <
    m = trimmed.match(COMPARISON_RE);
    if (m) {
      const op = COMPARISON_OP_MAP[m[2]];
      if (!op) return null;
      const val = stripQuotes(m[3].trim());
      return { field: m[1], operator: op, value: val };
    }

    // 9. Custom fallback — first token is field, rest is human-readable rule
    const parts = trimmed.split(/\s+/, 2);
    if (parts.length === 2) {
      return { field: parts[0], operator: "CUSTOM", value: parts[1] };
    }

    return null;
  }

  /**
   * Parse multiple rule expressions (e.g. from @DocInvariant(rules = {...})).
   *
   * @param expressions array of rule expression strings
   * @returns list of successfully parsed rules (never null, may be empty)
   */
  static parseAll(expressions: string[]): InvariantRule[] {
    if (!expressions) return [];
    return expressions
      .map((e) => PropertyDSLParser.parse(e))
      .filter((r): r is InvariantRule => r !== null);
  }
}
