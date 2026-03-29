"use client";

import React, { useState } from "react";
import type { IntentSignals } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { CodeBlock } from "../ui/CodeBlock.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface TestDetailPageProps {
  data: {
    className: string;
    methods: MethodEntry[];
    artifact: { label: string; color?: string };
  };
}

interface MethodEntry {
  qualified: string;
  name?: string;
  params?: { name: string; type: string }[];
  returns?: { type?: string; description?: string };
  intentSignals?: IntentSignals;
}

/* ------------------------------------------------------------------ */
/*  13 DSTI Channel descriptors                                        */
/* ------------------------------------------------------------------ */
interface ChannelDescriptor {
  key: keyof IntentSignals | string;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
}

const DSTI_CHANNELS: ChannelDescriptor[] = [
  { key: "nameSemantics", label: "Name Semantics", shortLabel: "Name", color: T.blue, bg: T.blueBg },
  { key: "guardClauses", label: "Guard Clauses", shortLabel: "Guards", color: T.red, bg: T.redBg },
  { key: "branches", label: "Branches", shortLabel: "Branch", color: T.accent, bg: T.accentBg },
  { key: "dataFlow", label: "Data Flow", shortLabel: "Data", color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
  { key: "loopProperties", label: "Loop Properties", shortLabel: "Loops", color: T.green, bg: T.greenBg },
  { key: "errorHandling", label: "Error Handling", shortLabel: "Errors", color: T.orange, bg: T.orangeBg },
  { key: "constants", label: "Constants", shortLabel: "Const", color: T.textMuted, bg: T.surface },
  { key: "dependencies", label: "Dependencies", shortLabel: "Deps", color: T.accent, bg: T.accentBg },
  { key: "nullChecks", label: "Null Checks", shortLabel: "Null", color: T.yellow, bg: T.yellowBg },
  { key: "assertions", label: "Assertions", shortLabel: "Assert", color: T.green, bg: T.greenBg },
  { key: "validationAnnotations", label: "Validation Annotations", shortLabel: "Valid", color: T.pink, bg: "rgba(244,114,182,0.08)" },
  { key: "logStatements", label: "Log Statements", shortLabel: "Logs", color: T.yellow, bg: T.yellowBg },
  { key: "intentDensityScore", label: "Density Score", shortLabel: "ISD", color: T.accent, bg: T.accentBg },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function channelValue(signals: IntentSignals, key: string): string | number | null {
  const v = (signals as Record<string, unknown>)[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return v > 0 ? v : null;
  if (Array.isArray(v)) return v.length > 0 ? v.length : null;
  if (typeof v === "object") {
    const keys = Object.keys(v as object);
    return keys.length > 0 ? keys.length : null;
  }
  return null;
}

function getIsd(signals?: IntentSignals): number {
  return signals?.intentDensityScore ?? 0;
}

function isdBadgeVariant(score: number): "success" | "warning" | "error" {
  if (score > 0.6) return "success";
  if (score >= 0.3) return "warning";
  return "error";
}

function isdLabel(score: number): string {
  if (score > 0.6) return "High";
  if (score >= 0.3) return "Medium";
  return "Low";
}

function shortMethodName(qualified: string): string {
  const parts = qualified.split(".");
  return parts[parts.length - 1] || qualified;
}

function camelToTitle(s: string): string {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

/* ------------------------------------------------------------------ */
/*  Test Code Generator                                                */
/* ------------------------------------------------------------------ */
function generateTestCode(method: MethodEntry): string {
  const signals = method.intentSignals ?? {};
  const name = method.name || shortMethodName(method.qualified);
  const titleName = camelToTitle(name);
  const intent = signals.nameSemantics?.intent ?? "unknown";
  const isd = getIsd(signals);

  const guardCount =
    signals.guardClauses !== undefined
      ? typeof signals.guardClauses === "number"
        ? signals.guardClauses
        : signals.guardClauses.length
      : 0;

  const branchCount =
    signals.branches !== undefined
      ? typeof signals.branches === "number"
        ? signals.branches
        : signals.branches.length
      : 0;

  const catchCount = signals.errorHandling?.catchBlocks ?? 0;
  const caughtTypes = signals.errorHandling?.caughtTypes ?? [];
  const nullChecks = signals.nullChecks ?? 0;
  const assertions = signals.assertions ?? 0;
  const validations = signals.validationAnnotations ?? 0;

  const params = method.params ?? [];
  const returnType = method.returns?.type ?? "void";

  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * Auto-generated test skeleton for ${method.qualified}`);
  lines.push(` * Intent: ${intent} | ISD: ${isd.toFixed(2)} (${isdLabel(isd)})`);
  lines.push(` * Channels detected: guards=${guardCount}, branches=${branchCount}, catch=${catchCount}, nullChecks=${nullChecks}`);
  lines.push(` */`);
  lines.push(``);

  // Guard clause tests
  if (guardCount > 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_shouldValidateGuards() {`);
    lines.push(`    // ${guardCount} guard clause(s) detected \u2014 verify precondition checks`);
    if (params.length > 0) {
      lines.push(`    assertThrows(IllegalArgumentException.class,`);
      lines.push(`        () -> service.${name}(${params.map(() => "null").join(", ")}));`);
    } else {
      lines.push(`    // Verify guard conditions throw on invalid state`);
      lines.push(`    assertThrows(IllegalStateException.class, () -> service.${name}());`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  // Branch coverage tests
  if (branchCount > 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_shouldCoverBranches() {`);
    lines.push(`    // ${branchCount} branch(es) detected \u2014 verify each path`);

    if (branchCount >= 2) {
      lines.push(`    // Path 1: primary branch`);
      lines.push(`    ${returnType !== "void" ? `var result1 = ` : ""}service.${name}(${params.map((p) => `/* ${p.name} */ validValue`).join(", ")});`);
      if (returnType !== "void") {
        lines.push(`    assertNotNull(result1);`);
      }
      lines.push(``);
      lines.push(`    // Path 2: alternate branch`);
      lines.push(`    ${returnType !== "void" ? `var result2 = ` : ""}service.${name}(${params.map((p) => `/* ${p.name} */ edgeValue`).join(", ")});`);
    } else {
      lines.push(`    ${returnType !== "void" ? `var result = ` : ""}service.${name}(${params.map((p) => `/* ${p.name} */ testValue`).join(", ")});`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  // Error handling tests
  if (catchCount > 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_shouldHandleErrors() {`);
    lines.push(`    // ${catchCount} catch block(s) detected \u2014 verify error handling`);
    if (caughtTypes.length > 0) {
      for (const ct of caughtTypes.slice(0, 3)) {
        const shortType = ct.split(".").pop() || ct;
        lines.push(`    // Simulate ${shortType}`);
        lines.push(`    assertDoesNotThrow(() -> service.${name}(/* trigger ${shortType} */));`);
      }
    } else {
      lines.push(`    assertDoesNotThrow(() -> service.${name}(/* error-triggering input */));`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  // Null check tests
  if (nullChecks > 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_shouldHandleNulls() {`);
    lines.push(`    // ${nullChecks} null check(s) detected \u2014 verify null safety`);
    for (const p of params.slice(0, 3)) {
      lines.push(`    assertThrows(NullPointerException.class,`);
      lines.push(`        () -> service.${name}(${params.map((pp) => pp.name === p.name ? "null" : `valid${camelToTitle(pp.name).replace(/\s/g, "")}`).join(", ")}));`);
    }
    if (params.length === 0) {
      lines.push(`    // Null safety verified internally`);
      lines.push(`    assertDoesNotThrow(() -> service.${name}());`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  // Validation annotation tests
  if (validations > 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_shouldValidateInput() {`);
    lines.push(`    // ${validations} validation annotation(s) detected \u2014 verify constraints`);
    lines.push(`    assertThrows(ConstraintViolationException.class,`);
    lines.push(`        () -> service.${name}(${params.map(() => "invalidValue").join(", ")}));`);
    lines.push(`}`);
    lines.push(``);
  }

  // Assertions tests
  if (assertions > 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_shouldMeetInvariants() {`);
    lines.push(`    // ${assertions} assertion(s) detected \u2014 verify invariants hold`);
    lines.push(`    ${returnType !== "void" ? `var result = ` : ""}service.${name}(${params.map((p) => `/* ${p.name} */ validValue`).join(", ")});`);
    if (returnType !== "void") {
      lines.push(`    assertNotNull(result);`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  // Fallback: basic happy-path test
  if (guardCount === 0 && branchCount === 0 && catchCount === 0 && nullChecks === 0 && validations === 0 && assertions === 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_happyPath() {`);
    lines.push(`    // ISD ${isd.toFixed(2)} \u2014 limited signals, basic test`);
    lines.push(`    ${returnType !== "void" ? `var result = ` : ""}service.${name}(${params.map((p) => `/* ${p.name} */ testValue`).join(", ")});`);
    if (returnType !== "void") {
      lines.push(`    assertNotNull(result);`);
    }
    lines.push(`}`);
  }

  return lines.join("\n");
}

/* ================================================================== */
/*  TestDetailPage                                                     */
/* ================================================================== */
export function TestDetailPage({ data }: TestDetailPageProps) {
  const { className, methods, artifact } = data;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedMethod = methods[selectedIndex] ?? methods[0];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Test Detail" },
        ]}
      />

      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text }}>Test Detail: {className}</h1>
          {artifact.label && <Badge variant="primary">{artifact.label}</Badge>}
        </div>
        <p style={{ color: T.textMuted }}>
          {methods.length} method{methods.length !== 1 ? "s" : ""} with intent signals.
          Select a method to view generated test code.
        </p>
      </header>

      {/* ============================================================ */}
      {/* Split Layout: method list (left) + test preview (right)       */}
      {/* ============================================================ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Responsive: stack on small, side-by-side on large */}
        <div style={{ display: "flex", gap: 24 }}>
          {/* ---- Left: method list ---- */}
          <div style={{ width: 360, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 12 }}>
                Methods ({methods.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "calc(100vh - 200px)", overflowY: "auto", paddingRight: 4 }}>
                {methods.map((method, i) => {
                  const signals = method.intentSignals ?? {};
                  const isd = getIsd(signals);
                  const isSelected = i === selectedIndex;

                  return (
                    <button
                      key={method.qualified}
                      onClick={() => setSelectedIndex(i)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 8,
                        border: isSelected
                          ? "1px solid " + T.accent
                          : "1px solid " + T.surfaceBorder,
                        background: isSelected ? T.accentBg : T.surface,
                        cursor: "pointer",
                        transition: "border-color 0.15s, background 0.15s",
                        outline: isSelected ? "1px solid " + T.accentBorder : "none",
                      }}
                    >
                      {/* Method name + ISD badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <code style={{ fontSize: 14, fontFamily: T.mono, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                          {shortMethodName(method.qualified)}
                        </code>
                        <Badge variant={isdBadgeVariant(isd)}>
                          {(isd * 100).toFixed(0)}%
                        </Badge>
                      </div>

                      {/* Parameters */}
                      {method.params && method.params.length > 0 && (
                        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ({method.params.map((p) => `${p.type} ${p.name}`).join(", ")})
                        </div>
                      )}

                      {/* Return type */}
                      {method.returns?.type && (
                        <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>
                          returns <span style={{ fontFamily: T.mono }}>{method.returns.type}</span>
                        </div>
                      )}

                      {/* Channel badges */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {DSTI_CHANNELS.map((ch) => {
                          const val = channelValue(signals, ch.key);
                          if (val === null) return null;
                          return (
                            <span
                              key={ch.key}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 500,
                                background: ch.bg,
                                color: ch.color,
                              }}
                            >
                              {ch.shortLabel}: {val}
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---- Right: test code preview ---- */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedMethod && (
              <MethodTestPreview method={selectedMethod} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Method Test Preview Panel                                          */
/* ------------------------------------------------------------------ */
function MethodTestPreview({ method }: { method: MethodEntry }) {
  const signals = method.intentSignals ?? {};
  const isd = getIsd(signals);
  const intent = signals.nameSemantics?.intent ?? "unknown";
  const verb = signals.nameSemantics?.verb;
  const obj = signals.nameSemantics?.object;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Method header card */}
      <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder, background: T.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <code style={{ fontSize: 16, fontFamily: T.mono, fontWeight: 600, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {method.qualified}
          </code>
          <Badge variant={isdBadgeVariant(isd)}>
            ISD: {isd.toFixed(2)} ({isdLabel(isd)})
          </Badge>
        </div>

        {/* Signature */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14, color: T.textMuted, marginBottom: 12 }}>
          {method.params && method.params.length > 0 && (
            <div>
              <span style={{ color: T.textDim }}>Params: </span>
              {method.params.map((p, i) => (
                <span key={p.name}>
                  {i > 0 && ", "}
                  <code style={{ fontFamily: T.mono, fontSize: 12 }}>{p.type}</code>{" "}
                  <span style={{ color: T.text }}>{p.name}</span>
                </span>
              ))}
            </div>
          )}
          {method.returns?.type && (
            <div>
              <span style={{ color: T.textDim }}>Returns: </span>
              <code style={{ fontFamily: T.mono, fontSize: 12 }}>{method.returns.type}</code>
            </div>
          )}
        </div>

        {/* Intent & semantics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Badge variant="info">{intent}</Badge>
          {verb && <Badge>verb: {verb}</Badge>}
          {obj && <Badge>object: {obj}</Badge>}
        </div>
      </div>

      {/* Channel detail grid */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 12 }}>DSTI Channel Breakdown</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {DSTI_CHANNELS.map((ch) => {
            const val = channelValue(signals, ch.key);
            const active = val !== null;
            return (
              <div
                key={ch.key}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid " + (active ? T.surfaceBorder : T.surfaceBorder + "80"),
                  textAlign: "center",
                  background: active ? T.surface : "transparent",
                  opacity: active ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: active ? T.text : T.textDim }}>
                  {active ? val : "--"}
                </div>
                <div style={{ fontSize: 12, color: T.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.label}</div>
                {active && (
                  <span style={{
                    display: "inline-block",
                    marginTop: 4,
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    background: ch.bg,
                    color: ch.color,
                  }}>
                    active
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed signal info */}
      {signals.dataFlow && (
        <div style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Data Flow</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14 }}>
            {signals.dataFlow.reads && signals.dataFlow.reads.length > 0 && (
              <div>
                <span style={{ color: T.textDim }}>Reads: </span>
                <span style={{ color: T.textMuted }}>{signals.dataFlow.reads.join(", ")}</span>
              </div>
            )}
            {signals.dataFlow.writes && signals.dataFlow.writes.length > 0 && (
              <div>
                <span style={{ color: T.textDim }}>Writes: </span>
                <span style={{ color: T.textMuted }}>{signals.dataFlow.writes.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {signals.errorHandling?.caughtTypes && signals.errorHandling.caughtTypes.length > 0 && (
        <div style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Caught Exception Types</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {signals.errorHandling.caughtTypes.map((t) => (
              <code key={t} style={{ padding: "4px 8px", borderRadius: 4, background: T.redBg, color: T.red, fontSize: 12, fontFamily: T.mono }}>{t}</code>
            ))}
          </div>
        </div>
      )}

      {/* Generated test code */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 12 }}>Generated Test Code</h3>
        <CodeBlock
          code={generateTestCode(method)}
          language="java"
          title={`${shortMethodName(method.qualified)}Test.java \u2014 auto-generated skeleton`}
        />
      </div>
    </div>
  );
}
