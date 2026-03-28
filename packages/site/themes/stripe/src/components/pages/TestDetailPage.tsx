"use client";

import React, { useState } from "react";
import type { IntentSignals } from "@docspec/core";
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
}

const DSTI_CHANNELS: ChannelDescriptor[] = [
  { key: "nameSemantics", label: "Name Semantics", shortLabel: "Name", color: "bg-blue-100 text-blue-700" },
  { key: "guardClauses", label: "Guard Clauses", shortLabel: "Guards", color: "bg-red-100 text-red-700" },
  { key: "branches", label: "Branches", shortLabel: "Branch", color: "bg-purple-100 text-purple-700" },
  { key: "dataFlow", label: "Data Flow", shortLabel: "Data", color: "bg-cyan-100 text-cyan-700" },
  { key: "loopProperties", label: "Loop Properties", shortLabel: "Loops", color: "bg-teal-100 text-teal-700" },
  { key: "errorHandling", label: "Error Handling", shortLabel: "Errors", color: "bg-orange-100 text-orange-700" },
  { key: "constants", label: "Constants", shortLabel: "Const", color: "bg-gray-100 text-gray-700" },
  { key: "dependencies", label: "Dependencies", shortLabel: "Deps", color: "bg-indigo-100 text-indigo-700" },
  { key: "nullChecks", label: "Null Checks", shortLabel: "Null", color: "bg-amber-100 text-amber-700" },
  { key: "assertions", label: "Assertions", shortLabel: "Assert", color: "bg-emerald-100 text-emerald-700" },
  { key: "validationAnnotations", label: "Validation Annotations", shortLabel: "Valid", color: "bg-pink-100 text-pink-700" },
  { key: "logStatements", label: "Log Statements", shortLabel: "Logs", color: "bg-yellow-100 text-yellow-800" },
  { key: "intentDensityScore", label: "Density Score", shortLabel: "ISD", color: "bg-violet-100 text-violet-700" },
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
    lines.push(`    // ${guardCount} guard clause(s) detected — verify precondition checks`);
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
    lines.push(`    // ${branchCount} branch(es) detected — verify each path`);

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
    lines.push(`    // ${catchCount} catch block(s) detected — verify error handling`);
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
    lines.push(`    // ${nullChecks} null check(s) detected — verify null safety`);
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
    lines.push(`    // ${validations} validation annotation(s) detected — verify constraints`);
    lines.push(`    assertThrows(ConstraintViolationException.class,`);
    lines.push(`        () -> service.${name}(${params.map(() => "invalidValue").join(", ")}));`);
    lines.push(`}`);
    lines.push(``);
  }

  // Assertions tests
  if (assertions > 0) {
    lines.push(`@Test`);
    lines.push(`void test${camelToTitle(name).replace(/\s/g, "")}_shouldMeetInvariants() {`);
    lines.push(`    // ${assertions} assertion(s) detected — verify invariants hold`);
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
    lines.push(`    // ISD ${isd.toFixed(2)} — limited signals, basic test`);
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

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-text-primary">Test Detail: {className}</h1>
          {artifact.label && <Badge variant="primary">{artifact.label}</Badge>}
        </div>
        <p className="text-text-secondary">
          {methods.length} method{methods.length !== 1 ? "s" : ""} with intent signals.
          Select a method to view generated test code.
        </p>
      </header>

      {/* ============================================================ */}
      {/* Split Layout: method list (left) + test preview (right)       */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ---- Left: method list ---- */}
        <div className="lg:w-[360px] lg:flex-shrink-0">
          <div className="sticky top-4">
            <h2 className="text-sm font-medium text-text-tertiary uppercase mb-3">
              Methods ({methods.length})
            </h2>
            <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {methods.map((method, i) => {
                const signals = method.intentSignals ?? {};
                const isd = getIsd(signals);
                const isSelected = i === selectedIndex;

                return (
                  <button
                    key={method.qualified}
                    onClick={() => setSelectedIndex(i)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                        : "border-border bg-surface hover:bg-surface-secondary"
                    }`}
                  >
                    {/* Method name + ISD badge */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <code className="text-sm font-mono text-text-primary truncate flex-1 min-w-0">
                        {shortMethodName(method.qualified)}
                      </code>
                      <Badge variant={isdBadgeVariant(isd)}>
                        {(isd * 100).toFixed(0)}%
                      </Badge>
                    </div>

                    {/* Parameters */}
                    {method.params && method.params.length > 0 && (
                      <div className="text-xs text-text-tertiary mb-1.5 truncate">
                        ({method.params.map((p) => `${p.type} ${p.name}`).join(", ")})
                      </div>
                    )}

                    {/* Return type */}
                    {method.returns?.type && (
                      <div className="text-xs text-text-tertiary mb-1.5">
                        returns <span className="font-mono">{method.returns.type}</span>
                      </div>
                    )}

                    {/* Channel badges */}
                    <div className="flex flex-wrap gap-1">
                      {DSTI_CHANNELS.map((ch) => {
                        const val = channelValue(signals, ch.key);
                        if (val === null) return null;
                        return (
                          <span
                            key={ch.key}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${ch.color}`}
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
        <div className="flex-1 min-w-0">
          {selectedMethod && (
            <MethodTestPreview method={selectedMethod} />
          )}
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
    <div className="space-y-6">
      {/* Method header card */}
      <div className="p-5 rounded-lg border border-border bg-surface-secondary">
        <div className="flex items-center gap-3 mb-3">
          <code className="text-base font-mono font-semibold text-text-primary flex-1 min-w-0 truncate">
            {method.qualified}
          </code>
          <Badge variant={isdBadgeVariant(isd)}>
            ISD: {isd.toFixed(2)} ({isdLabel(isd)})
          </Badge>
        </div>

        {/* Signature */}
        <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-3">
          {method.params && method.params.length > 0 && (
            <div>
              <span className="text-text-tertiary">Params: </span>
              {method.params.map((p, i) => (
                <span key={p.name}>
                  {i > 0 && ", "}
                  <code className="font-mono text-xs">{p.type}</code>{" "}
                  <span className="text-text-primary">{p.name}</span>
                </span>
              ))}
            </div>
          )}
          {method.returns?.type && (
            <div>
              <span className="text-text-tertiary">Returns: </span>
              <code className="font-mono text-xs">{method.returns.type}</code>
            </div>
          )}
        </div>

        {/* Intent & semantics */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{intent}</Badge>
          {verb && <Badge>verb: {verb}</Badge>}
          {obj && <Badge>object: {obj}</Badge>}
        </div>
      </div>

      {/* Channel detail grid */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">DSTI Channel Breakdown</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {DSTI_CHANNELS.map((ch) => {
            const val = channelValue(signals, ch.key);
            const active = val !== null;
            return (
              <div
                key={ch.key}
                className={`px-3 py-2 rounded-lg border text-center ${
                  active
                    ? "border-border bg-surface-secondary"
                    : "border-border/50 bg-surface opacity-50"
                }`}
              >
                <div className={`text-lg font-bold ${active ? "text-text-primary" : "text-text-tertiary"}`}>
                  {active ? val : "--"}
                </div>
                <div className="text-xs text-text-tertiary truncate">{ch.label}</div>
                {active && (
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${ch.color}`}>
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
        <div className="p-4 rounded-lg border border-border">
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Data Flow</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            {signals.dataFlow.reads && signals.dataFlow.reads.length > 0 && (
              <div>
                <span className="text-text-tertiary">Reads: </span>
                <span className="text-text-secondary">{signals.dataFlow.reads.join(", ")}</span>
              </div>
            )}
            {signals.dataFlow.writes && signals.dataFlow.writes.length > 0 && (
              <div>
                <span className="text-text-tertiary">Writes: </span>
                <span className="text-text-secondary">{signals.dataFlow.writes.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {signals.errorHandling?.caughtTypes && signals.errorHandling.caughtTypes.length > 0 && (
        <div className="p-4 rounded-lg border border-border">
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Caught Exception Types</h4>
          <div className="flex flex-wrap gap-2">
            {signals.errorHandling.caughtTypes.map((t) => (
              <code key={t} className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-mono">{t}</code>
            ))}
          </div>
        </div>
      )}

      {/* Generated test code */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">Generated Test Code</h3>
        <CodeBlock
          code={generateTestCode(method)}
          language="java"
          title={`${shortMethodName(method.qualified)}Test.java — auto-generated skeleton`}
        />
      </div>
    </div>
  );
}
