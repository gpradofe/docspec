package io.docspec.processor.dsti;

import io.docspec.annotation.*;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@DocBoundary("Parses @DocInvariant rule expressions into structured InvariantRule objects. Supports NOT_NULL, NOT_EMPTY, NOT_BLANK, SIZE comparisons, IN lists, BETWEEN ranges, MATCHES regex, and standard comparison operators.")
@DocInvariant(on = "PropertyDSL", rules = {
    "parse() returns null for unparseable expressions",
    "parseAll() never returns null"
})
public class PropertyDSL {

    // -- Patterns (compiled once) -------------------------------------------

    // Pattern: field NOT_NULL
    private static final Pattern NOT_NULL_PATTERN =
            Pattern.compile("^(\\S+)\\s+NOT_NULL$", Pattern.CASE_INSENSITIVE);

    // Pattern: field NOT_EMPTY
    private static final Pattern NOT_EMPTY_PATTERN =
            Pattern.compile("^(\\S+)\\s+NOT_EMPTY$", Pattern.CASE_INSENSITIVE);

    // Pattern: field NOT_BLANK
    private static final Pattern NOT_BLANK_PATTERN =
            Pattern.compile("^(\\S+)\\s+NOT_BLANK$", Pattern.CASE_INSENSITIVE);

    // Pattern: field SIZE > N, field SIZE >= N, etc.
    private static final Pattern SIZE_PATTERN =
            Pattern.compile("^(\\S+)\\s+SIZE\\s*(>=?|<=?|==|!=)\\s*(-?\\d+(?:\\.\\d+)?)$",
                    Pattern.CASE_INSENSITIVE);

    // Pattern: field IN [a, b, c]
    private static final Pattern IN_PATTERN =
            Pattern.compile("^(\\S+)\\s+IN\\s*\\[(.+)]$", Pattern.CASE_INSENSITIVE);

    // Pattern: field BETWEEN x AND y
    private static final Pattern BETWEEN_PATTERN =
            Pattern.compile("^(\\S+)\\s+BETWEEN\\s+(-?\\d+(?:\\.\\d+)?)\\s+AND\\s+(-?\\d+(?:\\.\\d+)?)$",
                    Pattern.CASE_INSENSITIVE);

    // Pattern: field MATCHES pattern
    private static final Pattern MATCHES_PATTERN =
            Pattern.compile("^(\\S+)\\s+MATCHES\\s+(.+)$", Pattern.CASE_INSENSITIVE);

    // Pattern: field > N, field >= N, field < N, field <= N, field == N, field != N
    private static final Pattern COMPARISON_PATTERN =
            Pattern.compile("^(\\S+)\\s*(>=|<=|!=|==|>|<)\\s*(.+)$");

    // -- Public API ---------------------------------------------------------

    @DocBoundary("A parsed invariant rule with field, operator, value(s), and range bounds")
    public static class InvariantRule {
        private String field;
        // One of: NOT_NULL, NOT_EMPTY, NOT_BLANK, SIZE, IN, BETWEEN, MATCHES, GT, GTE, LT, LTE, EQ, NEQ
        private String operator;
        // For simple comparisons and MATCHES
        private String value;
        // For IN operator
        private List<String> values;
        // For BETWEEN (lower bound, inclusive)
        private String minValue;
        // For BETWEEN (upper bound, inclusive)
        private String maxValue;
        // For SIZE: the comparison operator applied to the size (e.g. ">", ">=")
        private String sizeOperator;

        // -- Getters --

        public String getField() {
            return field;
        }

        public String getOperator() {
            return operator;
        }

        public String getValue() {
            return value;
        }

        public List<String> getValues() {
            return values;
        }

        public String getMinValue() {
            return minValue;
        }

        public String getMaxValue() {
            return maxValue;
        }

        public String getSizeOperator() {
            return sizeOperator;
        }

        // -- Setters --

        public void setField(String field) {
            this.field = field;
        }

        public void setOperator(String operator) {
            this.operator = operator;
        }

        public void setValue(String value) {
            this.value = value;
        }

        public void setValues(List<String> values) {
            this.values = values;
        }

        public void setMinValue(String minValue) {
            this.minValue = minValue;
        }

        public void setMaxValue(String maxValue) {
            this.maxValue = maxValue;
        }

        public void setSizeOperator(String sizeOperator) {
            this.sizeOperator = sizeOperator;
        }

        @Override
        public String toString() {
            StringBuilder sb = new StringBuilder("InvariantRule{field='").append(field).append("', operator='").append(operator).append("'");
            if (value != null) sb.append(", value='").append(value).append("'");
            if (values != null) sb.append(", values=").append(values);
            if (minValue != null) sb.append(", min='").append(minValue).append("'");
            if (maxValue != null) sb.append(", max='").append(maxValue).append("'");
            if (sizeOperator != null) sb.append(", sizeOp='").append(sizeOperator).append("'");
            sb.append("}");
            return sb.toString();
        }
    }

    @DocDeterministic
    @DocMethod(value = "Parses a rule expression string into an InvariantRule",
               since = "3.0.0",
               params = {@Param(name = "expression", value = "The rule expression, e.g. 'balance >= 0'")},
               returns = "The parsed rule, or null if the expression cannot be parsed")
    public static InvariantRule parse(String expression) {
        if (expression == null || expression.isBlank()) {
            return null;
        }

        String trimmed = expression.trim();

        // Try patterns in order of specificity (most specific first)

        // 1. NOT_NULL
        Matcher m = NOT_NULL_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            rule.setOperator("NOT_NULL");
            return rule;
        }

        // 2. NOT_EMPTY
        m = NOT_EMPTY_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            rule.setOperator("NOT_EMPTY");
            return rule;
        }

        // 3. NOT_BLANK
        m = NOT_BLANK_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            rule.setOperator("NOT_BLANK");
            return rule;
        }

        // 4. SIZE comparison (must be tried before plain comparison)
        m = SIZE_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            rule.setOperator("SIZE");
            rule.setSizeOperator(m.group(2));
            rule.setValue(m.group(3));
            return rule;
        }

        // 5. IN [values]
        m = IN_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            rule.setOperator("IN");
            String rawValues = m.group(2);
            List<String> valueList = new ArrayList<>();
            for (String v : rawValues.split(",")) {
                String stripped = v.trim();
                // Remove surrounding quotes if present
                if ((stripped.startsWith("\"") && stripped.endsWith("\"")) ||
                    (stripped.startsWith("'") && stripped.endsWith("'"))) {
                    stripped = stripped.substring(1, stripped.length() - 1);
                }
                if (!stripped.isEmpty()) {
                    valueList.add(stripped);
                }
            }
            rule.setValues(valueList);
            return rule;
        }

        // 6. BETWEEN x AND y
        m = BETWEEN_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            rule.setOperator("BETWEEN");
            rule.setMinValue(m.group(2));
            rule.setMaxValue(m.group(3));
            return rule;
        }

        // 7. MATCHES pattern
        m = MATCHES_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            rule.setOperator("MATCHES");
            String pattern = m.group(2).trim();
            // Remove surrounding quotes if present
            if ((pattern.startsWith("\"") && pattern.endsWith("\"")) ||
                (pattern.startsWith("'") && pattern.endsWith("'"))) {
                pattern = pattern.substring(1, pattern.length() - 1);
            }
            rule.setValue(pattern);
            return rule;
        }

        // 8. Comparison operators: >=, <=, !=, ==, >, <
        m = COMPARISON_PATTERN.matcher(trimmed);
        if (m.matches()) {
            InvariantRule rule = new InvariantRule();
            rule.setField(m.group(1));
            String op = m.group(2);
            String val = m.group(3).trim();

            switch (op) {
                case ">":
                    rule.setOperator("GT");
                    break;
                case ">=":
                    rule.setOperator("GTE");
                    break;
                case "<":
                    rule.setOperator("LT");
                    break;
                case "<=":
                    rule.setOperator("LTE");
                    break;
                case "==":
                    rule.setOperator("EQ");
                    break;
                case "!=":
                    rule.setOperator("NEQ");
                    break;
                default:
                    return null;
            }

            // Remove surrounding quotes from value if present
            if ((val.startsWith("\"") && val.endsWith("\"")) ||
                (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length() - 1);
            }

            rule.setValue(val);
            return rule;
        }

        // Could not parse — check if it's a free-form "field is ..." style
        // For forward compatibility, try to extract at least a field name
        String[] parts = trimmed.split("\\s+", 2);
        if (parts.length == 2) {
            // Treat the first token as the field, and the rest as a human-readable rule
            InvariantRule rule = new InvariantRule();
            rule.setField(parts[0]);
            rule.setOperator("CUSTOM");
            rule.setValue(parts[1]);
            return rule;
        }

        return null;
    }

    @DocDeterministic
    @DocMethod(value = "Parses multiple rule expressions from @DocInvariant rules arrays",
               since = "3.0.0",
               params = {@Param(name = "expressions", value = "Array of rule expression strings")},
               returns = "List of successfully parsed rules, never null, may be empty")
    public static List<InvariantRule> parseAll(String[] expressions) {
        if (expressions == null) {
            return Collections.emptyList();
        }
        List<InvariantRule> rules = new ArrayList<>();
        for (String expr : expressions) {
            InvariantRule rule = parse(expr);
            if (rule != null) {
                rules.add(rule);
            }
        }
        return rules;
    }
}
