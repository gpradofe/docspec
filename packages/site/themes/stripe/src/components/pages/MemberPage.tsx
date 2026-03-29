"use client";

import React, { useState } from "react";
import type {
  MemberPageData,
  Method,
  Constructor,
  Field,
  MemberDependency,
  IntentSignals,
  IntentMethod,
} from "@docspec/core";
import { T, CH, SC, KIND_COLORS } from "../../lib/tokens.js";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface MemberPageProps {
  data: MemberPageData;
  referenceIndex?: Record<string, string>;
  lens?: "docs" | "tests";
}

/* ------------------------------------------------------------------ */
/*  Shared primitives: Tag, ChTag, SectionLabel, Code                  */
/* ------------------------------------------------------------------ */
function Tag({ children, color = T.accent }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: color + "14",
        color,
        border: `1px solid ${color}30`,
        fontFamily: T.mono,
        letterSpacing: "0.02em",
        lineHeight: "16px",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function ChTag({ ch }: { ch: string }) {
  const c = CH[ch];
  if (!c) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: c.c + "14",
        color: c.c,
        border: `1px solid ${c.c}30`,
      }}
    >
      {c.l}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.textDim,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function InlineCode({ code, title, lang }: { code: string; title?: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        borderRadius: 9,
        overflow: "hidden",
        border: `1px solid ${T.codeBorder}`,
        background: T.codeBg,
      }}
    >
      {title && (
        <div
          style={{
            padding: "8px 14px",
            borderBottom: `1px solid ${T.codeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>
            {title}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {lang && (
              <span style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>
                {lang}
              </span>
            )}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
                border: `1px solid ${T.surfaceBorder}`,
                background: copied ? "rgba(52,211,153,0.12)" : "transparent",
                color: copied ? T.green : T.textDim,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: T.mono,
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <pre
        style={{
          padding: "14px 16px",
          margin: 0,
          overflowX: "auto",
          fontSize: 12.5,
          lineHeight: 1.7,
          fontFamily: T.mono,
        }}
      >
        {code.split("\n").map((ln, i) => {
          let c: string = T.text;
          if (/^\s*(\/\/|#|<!--|--)/.test(ln)) c = T.textDim;
          else if (/^\s*@/.test(ln)) c = "#93c5fd";
          else if (/\b(assert\w+)\b/.test(ln)) c = T.yellow;
          else if (
            /\b(import|from|const|var|let|def|class|public|private|void|return|new|await|async|if|else|for|try|catch|throw|throws|package|interface|extends|implements|static|final)\b/.test(ln)
          ) c = T.accentText;
          else if (/["']/.test(ln)) c = T.green;
          return (
            <div key={i} style={{ color: c, minHeight: 18 }}>
              {ln || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: compute ISD for a method from IntentSignals                */
/* ------------------------------------------------------------------ */
function getIsd(signals?: IntentSignals): number {
  return signals?.intentDensityScore ?? 0;
}

function getChannelCount(signals?: IntentSignals): number {
  if (!signals) return 0;
  let count = 0;
  if (signals.nameSemantics) count++;
  if (signals.guardClauses) count++;
  if (signals.branches) count++;
  if (signals.dataFlow) count++;
  if (signals.loopProperties) count++;
  if (signals.errorHandling) count++;
  if (signals.constants) count++;
  if (signals.dependencies) count++;
  if (signals.nullChecks) count++;
  if (signals.assertions) count++;
  if (signals.logStatements) count++;
  if (signals.validationAnnotations) count++;
  return count;
}

function getActiveChannels(signals?: IntentSignals): string[] {
  if (!signals) return [];
  const channels: string[] = [];
  if (signals.nameSemantics) channels.push("naming");
  if (signals.guardClauses) channels.push("guards");
  if (signals.branches) channels.push("branches");
  if (signals.dataFlow) channels.push("dataflow");
  if (signals.loopProperties) channels.push("loops");
  if (signals.errorHandling) channels.push("errors");
  if (signals.constants) channels.push("constants");
  if (signals.dependencies) channels.push("messages");
  if (signals.nullChecks) channels.push("nullchecks");
  if (signals.assertions) channels.push("assertions");
  if (signals.logStatements) channels.push("logging");
  if (signals.validationAnnotations) channels.push("types");
  return channels;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function MemberPage({ data, referenceIndex, lens = "docs" }: MemberPageProps) {
  const { member, artifact, referencedIn, examples } = data;
  const kindColor = KIND_COLORS[member.kind] || T.accent;

  if (lens === "tests") {
    return <TestsLens data={data} referenceIndex={referenceIndex} />;
  }

  return <DocsLens data={data} referenceIndex={referenceIndex} />;
}

/* ================================================================== */
/*  DOCS LENS                                                          */
/* ================================================================== */
function DocsLens({
  data,
  referenceIndex,
}: {
  data: MemberPageData;
  referenceIndex?: Record<string, string>;
}) {
  const { member, artifact, referencedIn } = data;
  const kindColor = KIND_COLORS[member.kind] || T.accent;
  const [expandedMethod, setExpandedMethod] = useState<string | null>(
    member.methods?.[0]?.name ?? null
  );

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      {/* Header: kind badge, tag badges, since */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Tag color={kindColor}>{member.kind}</Tag>
        {member.tags?.map((t) => (
          <Tag key={t} color={T.textDim}>
            {t}
          </Tag>
        ))}
        {member.since && (
          <span
            style={{
              fontSize: 10.5,
              color: T.textDim,
              fontFamily: T.mono,
              marginLeft: "auto",
            }}
          >
            since {member.since}
          </span>
        )}
      </div>

      {/* Class name */}
      <h2
        style={{
          fontSize: 24,
          fontWeight: 740,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 4px",
        }}
      >
        {member.name}
      </h2>

      {/* Qualified name */}
      <code
        style={{
          fontSize: 12,
          color: T.textDim,
          fontFamily: T.mono,
          display: "block",
          marginBottom: 14,
        }}
      >
        {member.qualified}
      </code>

      {/* Description */}
      {member.description && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: T.textMuted,
            margin: "0 0 28px",
            maxWidth: 620,
          }}
        >
          {member.description}
        </p>
      )}

      {/* CLASS TEST HEALTH box */}
      {member.methods && member.methods.length > 0 && (
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 10,
            background: T.surface,
            border: `1px solid ${T.surfaceBorder}`,
            marginBottom: 28,
          }}
        >
          <div
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("docspec-lens", "tests");
                window.location.reload();
              }
            }}
            title="Switch to Tests lens"
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            Class Test Health
          </div>
          {member.methods.map((m) => {
            const coverage = Math.min(100, Math.round(getIsd(findMethodSignals(data, m.name)) * 10));
            return (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <code
                  style={{
                    fontSize: 11,
                    fontFamily: T.mono,
                    color: T.text,
                    minWidth: 140,
                  }}
                >
                  {m.name}()
                </code>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: T.surfaceBorder,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${coverage}%`,
                      height: "100%",
                      borderRadius: 3,
                      background: coverage >= 70 ? T.green : coverage >= 40 ? T.yellow : T.red,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 650,
                    color: coverage >= 70 ? T.green : coverage >= 40 ? T.yellow : T.red,
                    minWidth: 30,
                    textAlign: "right",
                  }}
                >
                  {coverage}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Fields section */}
      {member.fields && member.fields.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Fields</SectionLabel>
          {member.fields.map((f) => (
            <FieldCard key={f.name} field={f} />
          ))}
        </div>
      )}

      {/* Dependencies section */}
      {member.dependencies && member.dependencies.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Dependencies</SectionLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {member.dependencies.map((dep) => (
              <DependencyCard key={dep.name} dep={dep} />
            ))}
          </div>
        </div>
      )}

      {/* Methods section */}
      {member.methods && member.methods.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Methods</SectionLabel>
          {member.methods.map((m) => {
            const expanded = expandedMethod === m.name;
            const signals = findMethodSignals(data, m.name);
            const isd = getIsd(signals);
            return (
              <div
                key={m.name}
                style={{
                  marginBottom: 16,
                  borderRadius: 10,
                  border: `1px solid ${expanded ? T.accent + "40" : T.surfaceBorder}`,
                  background: T.cardBg,
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
              >
                {/* Method header button */}
                <button
                  onClick={() => setExpandedMethod(expanded ? null : m.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "16px 18px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Tag color={T.accent}>method</Tag>
                  <code
                    style={{
                      fontSize: 14,
                      fontWeight: 650,
                      color: T.accent,
                      fontFamily: T.mono,
                    }}
                  >
                    {m.name}
                  </code>
                  {m.since && (
                    <span
                      style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono }}
                    >
                      since {m.since}
                    </span>
                  )}
                  {isd > 0 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("docspec-lens", "tests");
                          window.location.reload();
                        }
                      }}
                      title="Switch to Tests lens"
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: T.orangeBg,
                        color: T.orange,
                        fontWeight: 650,
                        fontFamily: T.mono,
                        cursor: "pointer",
                      }}
                    >
                      ISD {isd.toFixed(1)}
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      transform: expanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s",
                      color: T.textDim,
                    }}
                  >
                    {"\u25B6"}
                  </span>
                </button>

                {/* Expanded method content */}
                {expanded && (
                  <div
                    style={{
                      padding: "0 18px 18px",
                      borderTop: `1px solid ${T.surfaceBorder}`,
                    }}
                  >
                    {/* Description */}
                    {m.description && (
                      <p
                        style={{
                          fontSize: 13.5,
                          lineHeight: 1.7,
                          color: T.textMuted,
                          margin: "14px 0",
                        }}
                      >
                        {m.description}
                      </p>
                    )}

                    {/* Parameters */}
                    {m.params && m.params.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 650,
                            color: T.textDim,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 6,
                          }}
                        >
                          Parameters
                        </div>
                        {m.params.map((p) => (
                          <div
                            key={p.name}
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: 8,
                              padding: "5px 0",
                              fontSize: 12.5,
                            }}
                          >
                            <code
                              style={{
                                color: T.text,
                                fontFamily: T.mono,
                                fontWeight: 550,
                              }}
                            >
                              {p.name}
                            </code>
                            <span
                              style={{
                                color: T.textDim,
                                fontFamily: T.mono,
                                fontSize: 11,
                              }}
                            >
                              {p.type}
                            </span>
                            {p.required && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: T.red,
                                  fontWeight: 650,
                                }}
                              >
                                REQUIRED
                              </span>
                            )}
                            {p.description && (
                              <span style={{ color: T.textMuted }}>
                                {"\u2014"} {p.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Returns */}
                    {m.returns && m.returns.type && m.returns.type !== "void" && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 650,
                            color: T.textDim,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 4,
                          }}
                        >
                          Returns
                        </div>
                        <div style={{ fontSize: 12.5 }}>
                          <code style={{ color: T.green, fontFamily: T.mono }}>
                            {m.returns.type}
                          </code>
                          {m.returns.description && (
                            <span style={{ color: T.textMuted }}>
                              {" "}{"\u2014"} {m.returns.description}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Throws */}
                    {m.throws && m.throws.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 650,
                            color: T.textDim,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 4,
                          }}
                        >
                          Throws
                        </div>
                        {m.throws.map((t, idx) => (
                          <div
                            key={idx}
                            style={{ fontSize: 12.5, padding: "2px 0" }}
                          >
                            <code style={{ color: T.red, fontFamily: T.mono }}>
                              {t.type || "Exception"}
                            </code>
                            {t.description && (
                              <span style={{ color: T.textMuted }}>
                                {" "}{"\u2014"} {t.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Example */}
                    {m.examples && m.examples.length > 0 && (
                      <InlineCode
                        code={m.examples[0].code}
                        lang={m.examples[0].language || "java"}
                        title="Example"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Enum values */}
      {member.values && member.values.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Enum Values ({member.values.length})</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {member.values.map((v) => (
              <code
                key={v}
                style={{
                  fontSize: 12,
                  fontFamily: T.mono,
                  color: T.text,
                  background: T.surfaceBorder + "60",
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: `1px solid ${T.surfaceBorder}`,
                }}
              >
                {v}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Constructors */}
      {member.constructors && member.constructors.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Constructors</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {member.constructors.map((ctor, i) => (
              <ConstructorCard key={i} ctor={ctor} memberName={member.name} />
            ))}
          </div>
        </div>
      )}

      {/* Annotation Source */}
      <div style={{ marginTop: 28 }}>
        <SectionLabel>Annotation Source</SectionLabel>
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 10,
            background: T.accentBg,
            border: `1px solid ${T.accentBorder}`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.accent,
              marginBottom: 8,
            }}
          >
            How DocSpec extracts this {member.kind}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: T.textMuted }}>
            The processor reads{" "}
            <code
              style={{ color: T.accentText, fontFamily: T.mono, fontSize: 12 }}
            >
              @DocModule
            </code>{" "}
            to create the module entry, then scans each public method for{" "}
            <code
              style={{ color: T.accentText, fontFamily: T.mono, fontSize: 12 }}
            >
              @DocMethod
            </code>{" "}
            metadata.
            {member.kind === "class" &&
              " DSTI runs 13 intent channels on each method body via AST analysis."}
          </div>
        </div>
        <InlineCode
          code={generateAnnotationSource(member)}
          lang="java"
          title={`${member.name}.java \u2014 annotated source`}
        />
      </div>

      {/* Referenced In */}
      {referencedIn && hasReferencedIn(referencedIn) && (
        <div style={{ marginTop: 28 }}>
          <SectionLabel>Referenced In</SectionLabel>
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 8,
              background: T.surface,
              border: `1px solid ${T.surfaceBorder}`,
              fontSize: 12.5,
              lineHeight: 2,
            }}
          >
            {referencedIn.endpoints.length > 0 && (
              <div>
                <span style={{ color: T.textDim }}>Endpoints:</span>{" "}
                <span style={{ color: T.accent, fontWeight: 550 }}>
                  {referencedIn.endpoints.map((e) => e.label).join(", ")}
                </span>
              </div>
            )}
            {referencedIn.flows.length > 0 && (
              <div>
                <span style={{ color: T.textDim }}>Flows:</span>{" "}
                <span style={{ color: T.accent, fontWeight: 550 }}>
                  {referencedIn.flows.map((f) => f.label).join(", ")}
                </span>
              </div>
            )}
            {referencedIn.contexts.length > 0 && (
              <div>
                <span style={{ color: T.textDim }}>Contexts:</span>{" "}
                <span style={{ color: T.accent, fontWeight: 550 }}>
                  {referencedIn.contexts.map((c) => c.label).join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  TESTS LENS                                                         */
/* ================================================================== */
function TestsLens({
  data,
  referenceIndex,
}: {
  data: MemberPageData;
  referenceIndex?: Record<string, string>;
}) {
  const { member, artifact } = data;
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const intentMethods = getIntentMethods(data);
  const totalTests = intentMethods.reduce(
    (sum, im) => sum + getChannelCount(im.intentSignals),
    0
  );
  const totalGaps = intentMethods.reduce((sum, im) => {
    const channels = getActiveChannels(im.intentSignals);
    return sum + (13 - channels.length);
  }, 0);
  const avgIsd =
    intentMethods.length > 0
      ? intentMethods.reduce((sum, im) => sum + getIsd(im.intentSignals), 0) /
        intentMethods.length
      : 0;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      {/* Header with DSTI badge, ISD score, gap count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Tag color={T.orange}>DSTI</Tag>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            background: T.greenBg,
            border: `1px solid ${T.greenBorder}`,
            color: T.green,
            fontWeight: 650,
          }}
        >
          ISD {avgIsd.toFixed(1)}
        </span>
        {totalGaps > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              background: T.yellowBg,
              border: `1px solid ${T.yellowBorder}`,
              color: T.yellow,
              fontWeight: 650,
            }}
          >
            {totalGaps} gaps
          </span>
        )}
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: T.accent,
            textDecoration: "none",
            fontWeight: 550,
          }}
        >
          {"\u2190"} View Docs
        </a>
      </div>

      {/* Class name */}
      <h1
        style={{
          fontSize: 20,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.02em",
          margin: "0 0 4px",
          fontFamily: T.mono,
        }}
      >
        {member.name}
      </h1>
      <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>
        {totalTests} tests from {intentMethods.length} methods
      </p>

      {/* Method table */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 12,
        }}
      >
        Method Overview
      </div>
      <div
        style={{
          borderRadius: 10,
          border: `1px solid ${T.surfaceBorder}`,
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 60px 1fr 60px 60px",
            padding: "8px 14px",
            background: T.surface,
            borderBottom: `1px solid ${T.surfaceBorder}`,
            fontSize: 9,
            fontWeight: 700,
            color: T.textFaint,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <div>Method</div>
          <div style={{ textAlign: "center" }}>ISD</div>
          <div>Channels</div>
          <div style={{ textAlign: "center" }}>Tests</div>
          <div style={{ textAlign: "center" }}>Status</div>
        </div>

        {/* Table rows */}
        {intentMethods.map((im) => {
          const name = im.qualified.split(".").pop() || im.qualified;
          const isd = getIsd(im.intentSignals);
          const channels = getActiveChannels(im.intentSignals);
          const testCount = getChannelCount(im.intentSignals);
          const expanded = expandedMethod === im.qualified;

          return (
            <div key={im.qualified}>
              <button
                onClick={() =>
                  setExpandedMethod(expanded ? null : im.qualified)
                }
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 60px 1fr 60px 60px",
                  padding: "10px 14px",
                  width: "100%",
                  border: "none",
                  borderBottom: `1px solid ${T.surfaceBorder}`,
                  background: expanded ? T.surfaceHover : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
              >
                <code
                  style={{
                    fontSize: 12,
                    fontFamily: T.mono,
                    color: T.text,
                    fontWeight: 550,
                  }}
                >
                  {name}()
                </code>
                <div style={{ textAlign: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isd >= 8 ? T.green : isd >= 4 ? T.yellow : T.red,
                    }}
                  >
                    {isd.toFixed(1)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {channels.slice(0, 5).map((ch) => {
                    const info = CH[ch];
                    return info ? (
                      <span
                        key={ch}
                        title={info.l}
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: info.c + "14",
                          color: info.c,
                          cursor: "default",
                        }}
                      >
                        {info.l}
                      </span>
                    ) : null;
                  })}
                  {channels.length > 5 && (
                    <span style={{ fontSize: 10, color: T.textDim }}>
                      +{channels.length - 5}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.accent,
                  }}
                >
                  {testCount}
                </div>
                <div style={{ textAlign: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: testCount > 0 ? T.green : T.yellow,
                    }}
                  >
                    {testCount > 0 ? "OK" : "!!"}
                  </span>
                </div>
              </button>

              {/* Expanded: channel signals + generated tests */}
              {expanded && (
                <div
                  style={{
                    padding: "16px 18px",
                    borderBottom: `1px solid ${T.surfaceBorder}`,
                    background: T.cardBg,
                  }}
                >
                  {/* Channel signals */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.textDim,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 12,
                    }}
                  >
                    Extracted Intent Signals
                  </div>
                  {renderChannelSignals(im.intentSignals)}

                  {/* Generated tests */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.textDim,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginTop: 20,
                      marginBottom: 12,
                    }}
                  >
                    Generated Tests
                  </div>
                  {renderGeneratedTests(
                    im,
                    name,
                    expandedTest,
                    setExpandedTest
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components: FieldCard, DependencyCard, ConstructorCard          */
/* ------------------------------------------------------------------ */
function FieldCard({ field }: { field: Field }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: `1px solid ${T.surfaceBorder}`,
        background: T.cardBg,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <code
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.text,
            fontFamily: T.mono,
          }}
        >
          {field.name}
        </code>
        <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>
          {field.type}
        </span>
        {field.modifiers?.map((m) => (
          <Tag key={m} color={T.textDim}>
            {m}
          </Tag>
        ))}
      </div>
      {field.description && (
        <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
          {field.description}
        </div>
      )}
    </div>
  );
}

function DependencyCard({ dep }: { dep: MemberDependency }) {
  const classColor =
    dep.classification === "file_system"
      ? T.yellow
      : dep.classification === "database"
      ? T.green
      : dep.classification === "message_broker"
      ? T.orange
      : dep.classification === "cache"
      ? T.red
      : T.blue;

  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid ${T.surfaceBorder}`,
        background: T.cardBg,
        fontSize: 12,
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
    >
      <code style={{ fontWeight: 600, fontFamily: T.mono, color: T.text }}>
        {dep.name}
      </code>
      {dep.classification && (
        <span
          style={{
            fontSize: 10,
            marginLeft: 6,
            padding: "1px 5px",
            borderRadius: 3,
            background: classColor + "14",
            color: classColor,
            fontWeight: 600,
            fontFamily: T.mono,
          }}
        >
          {dep.classification}
        </span>
      )}
    </div>
  );
}

function ConstructorCard({
  ctor,
  memberName,
}: {
  ctor: Constructor;
  memberName: string;
}) {
  const params = ctor.params || [];
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid ${T.surfaceBorder}`,
        background: T.cardBg,
      }}
    >
      <code style={{ fontSize: 13, fontFamily: T.mono }}>
        {ctor.visibility && (
          <span style={{ color: T.accentText }}>{ctor.visibility} </span>
        )}
        <span style={{ fontWeight: 600, color: T.text }}>{memberName}</span>
        <span style={{ color: T.textDim }}>(</span>
        {params.map((p, i) => (
          <React.Fragment key={p.name}>
            {i > 0 && <span style={{ color: T.textDim }}>, </span>}
            <span style={{ color: T.green }}>{p.type}</span>{" "}
            <span style={{ color: T.textMuted }}>{p.name}</span>
          </React.Fragment>
        ))}
        <span style={{ color: T.textDim }}>)</span>
      </code>
      {ctor.description && (
        <p
          style={{
            fontSize: 12.5,
            color: T.textMuted,
            marginTop: 6,
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          {ctor.description}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tests lens helpers                                                  */
/* ------------------------------------------------------------------ */
function findMethodSignals(
  data: MemberPageData,
  methodName: string
): IntentSignals | undefined {
  return undefined;
}

function getIntentMethods(data: MemberPageData): IntentMethod[] {
  const methods = data.member.methods || [];
  return methods.map((m) => ({
    qualified: `${data.member.qualified}.${m.name}`,
    intentSignals: undefined,
  }));
}

function hasReferencedIn(ref: { flows: any[]; endpoints: any[]; contexts: any[] }): boolean {
  return ref.flows.length > 0 || ref.endpoints.length > 0 || ref.contexts.length > 0;
}

function generateAnnotationSource(member: { kind: string; name: string; qualified: string; tags?: string[]; since?: string; methods?: Method[] }): string {
  const tags = member.tags?.length ? `@DocTags({${member.tags.map((t) => `"${t}"`).join(", ")}})` : "";
  const pkg = member.qualified.substring(0, member.qualified.lastIndexOf("."));
  const methods = (member.methods || [])
    .map(
      (m) =>
        `    @DocMethod(since = "${m.since || ""}")
    public ${m.returns?.type || "void"} ${m.name}(${(m.params || []).map((p) => `${p.type} ${p.name}`).join(", ")}) {
        // ...
    }`
    )
    .join("\n\n");

  return `@DocModule(id = "${slugify(member.name)}",
    name = "${member.name}",
    since = "${member.since || ""}")
${tags ? tags + "\n" : ""}public ${member.kind} ${member.name} {

${methods}
}`;
}

/* ------------------------------------------------------------------ */
/*  Render channel signals for Tests lens                              */
/* ------------------------------------------------------------------ */
function renderChannelSignals(signals?: IntentSignals) {
  if (!signals) {
    return (
      <div style={{ fontSize: 12.5, color: T.textDim, padding: "8px 0" }}>
        No intent signals extracted for this method.
      </div>
    );
  }

  const entries: { ch: string; description: string; evidence?: string[] }[] = [];

  if (signals.nameSemantics) {
    entries.push({
      ch: "naming",
      description: `Verb "${signals.nameSemantics.verb || "unknown"}" implies ${signals.nameSemantics.intent || "action"}`,
    });
  }
  if (signals.guardClauses) {
    const count = typeof signals.guardClauses === "number" ? signals.guardClauses : signals.guardClauses.length;
    entries.push({
      ch: "guards",
      description: `${count} guard clause${count !== 1 ? "s" : ""} detected`,
      evidence: Array.isArray(signals.guardClauses)
        ? signals.guardClauses.map((g) => g.condition || "guard")
        : undefined,
    });
  }
  if (signals.branches) {
    const count = typeof signals.branches === "number" ? signals.branches : signals.branches.length;
    entries.push({
      ch: "branches",
      description: `${count} branch${count !== 1 ? "es" : ""} in control flow`,
    });
  }
  if (signals.dataFlow) {
    const reads = signals.dataFlow.reads?.length ?? 0;
    const writes = signals.dataFlow.writes?.length ?? 0;
    entries.push({
      ch: "dataflow",
      description: `${reads} reads, ${writes} writes detected`,
    });
  }
  if (signals.loopProperties) {
    const parts: string[] = [];
    if (signals.loopProperties.hasStreams) parts.push("streams");
    if (signals.loopProperties.hasEnhancedFor) parts.push("enhanced for");
    if (signals.loopProperties.streamOps?.length) parts.push(signals.loopProperties.streamOps.join(", "));
    entries.push({
      ch: "loops",
      description: parts.length > 0 ? `Loop patterns: ${parts.join(", ")}` : "Loop structures detected",
    });
  }
  if (signals.errorHandling) {
    entries.push({
      ch: "errors",
      description: `${signals.errorHandling.catchBlocks ?? 0} catch block${(signals.errorHandling.catchBlocks ?? 0) !== 1 ? "s" : ""}${signals.errorHandling.caughtTypes?.length ? ": " + signals.errorHandling.caughtTypes.join(", ") : ""}`,
    });
  }
  if (signals.constants) {
    const count = Array.isArray(signals.constants) ? signals.constants.length : 0;
    entries.push({
      ch: "constants",
      description: `${count} constant${count !== 1 ? "s" : ""} referenced`,
    });
  }
  if (signals.nullChecks) {
    entries.push({
      ch: "nullchecks",
      description: `${signals.nullChecks} null check${signals.nullChecks !== 1 ? "s" : ""}`,
    });
  }
  if (signals.assertions) {
    entries.push({
      ch: "assertions",
      description: `${signals.assertions} assertion${signals.assertions !== 1 ? "s" : ""}`,
    });
  }
  if (signals.logStatements) {
    entries.push({
      ch: "logging",
      description: `${signals.logStatements} log statement${signals.logStatements !== 1 ? "s" : ""}`,
    });
  }
  if (signals.validationAnnotations) {
    entries.push({
      ch: "types",
      description: `${signals.validationAnnotations} validation annotation${signals.validationAnnotations !== 1 ? "s" : ""}`,
    });
  }

  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: T.textDim, padding: "8px 0" }}>
        No intent signals extracted for this method.
      </div>
    );
  }

  return entries.map((entry) => (
    <div
      key={entry.ch}
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        border: `1px solid ${T.surfaceBorder}`,
        background: T.cardBg,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: entry.evidence ? 8 : 0,
        }}
      >
        <ChTag ch={entry.ch} />
        <div
          style={{
            flex: 1,
            fontSize: 12.5,
            color: T.textMuted,
            lineHeight: 1.5,
          }}
        >
          {entry.description}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.accent,
            whiteSpace: "nowrap",
          }}
        >
          1 test
        </span>
      </div>
      {entry.evidence && (
        <div
          style={{
            marginTop: 6,
            padding: "8px 10px",
            borderRadius: 6,
            background: T.codeBg,
            border: `1px solid ${T.codeBorder}`,
            fontSize: 11,
            fontFamily: T.mono,
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 650,
              color: T.textFaint,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            Source evidence
          </div>
          {entry.evidence.map((ln, i) => (
            <div key={i} style={{ color: T.textMuted }}>
              {ln}
            </div>
          ))}
          <div
            style={{
              fontSize: 9,
              fontWeight: 650,
              color: CH[entry.ch]?.c || T.accent,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginTop: 6,
            }}
          >
            Intent: {entry.description}
          </div>
        </div>
      )}
    </div>
  ));
}

/* ------------------------------------------------------------------ */
/*  Render generated tests for Tests lens                              */
/* ------------------------------------------------------------------ */
function renderGeneratedTests(
  im: IntentMethod,
  methodName: string,
  expandedTest: string | null,
  setExpandedTest: (t: string | null) => void
) {
  const channels = getActiveChannels(im.intentSignals);

  if (channels.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: T.textDim, padding: "8px 0" }}>
        No generated tests available for this method.
      </div>
    );
  }

  return channels.map((ch) => {
    const testName = `${methodName}_${ch}_test`;
    const expanded = expandedTest === testName;
    const isGap = ch === "gap";
    const statusColor = isGap ? T.yellow : T.green;

    return (
      <div
        key={testName}
        style={{
          marginBottom: 12,
          borderRadius: 10,
          border: `1px solid ${expanded ? T.accent + "40" : T.surfaceBorder}`,
          background: T.cardBg,
          overflow: "hidden",
          transition: "border-color 0.2s",
        }}
      >
        {/* Test header */}
        <button
          onClick={() => setExpandedTest(expanded ? null : testName)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "12px 16px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{ fontSize: 12, fontWeight: 700, color: statusColor }}
          >
            {isGap ? "!!" : "OK"}
          </span>
          <code
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: T.mono,
              color: T.text,
            }}
          >
            {testName}
          </code>
          <ChTag ch={ch} />
          {isGap && <Tag color={T.yellow}>BUG?</Tag>}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 0.15s",
              color: T.textDim,
            }}
          >
            {"\u25B6"}
          </span>
        </button>

        {expanded && (
          <div style={{ borderTop: `1px solid ${T.surfaceBorder}` }}>
            {/* Intent vs Code visualization */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                borderBottom: `1px solid ${T.surfaceBorder}`,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRight: `1px solid ${T.surfaceBorder}`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: T.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  Intent (what the developer claims)
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.textMuted,
                    fontFamily: T.mono,
                    lineHeight: 1.6,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: T.accentBg,
                    border: `1px solid ${T.accentBorder}`,
                  }}
                >
                  Channel: {CH[ch]?.l || ch}
                </div>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: isGap ? T.yellow : T.green,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  {isGap
                    ? "Actual behavior (MISMATCH)"
                    : "Actual behavior (MATCHES)"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.textMuted,
                    fontFamily: T.mono,
                    lineHeight: 1.6,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: isGap ? T.yellowBg : T.greenBg,
                    border: `1px solid ${isGap ? T.yellowBorder : T.greenBorder}`,
                  }}
                >
                  Signal detected in {CH[ch]?.l || ch} channel
                </div>
              </div>
            </div>

            {/* Why */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: `1px solid ${T.surfaceBorder}`,
                background: T.surface,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  color: T.textMuted,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ fontWeight: 600, color: T.text }}>Why:</span>{" "}
                Test verifies {CH[ch]?.l || ch} channel signal is consistent
                with method behavior.
              </div>
            </div>

            {/* Test code */}
            <InlineCode
              code={generateTestStub(methodName, ch)}
              title={`${testName}.java`}
              lang="java"
            />
          </div>
        )}
      </div>
    );
  });
}

function generateTestStub(methodName: string, channel: string): string {
  const chLabel = CH[channel]?.l || channel;
  return `@Test
void ${methodName}_${channel}_verifyIntent() {
    // Verify ${chLabel} channel signal
    var result = ${methodName}();
    // Assert ${chLabel.toLowerCase()} behavior matches intent
    assertNotNull(result);
}`;
}
