"use client";

import React from "react";
import type { MemberPageData, Method, Constructor, Field } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { MethodSignature } from "../ui/MethodSignature.js";
import { TypeLink } from "../ui/TypeLink.js";
import { ReferencedInPanel } from "../ui/ReferencedInPanel.js";
import { LanguageTabs } from "../ui/LanguageTabs.js";

interface MemberPageProps {
  data: MemberPageData;
  referenceIndex?: Record<string, string>;
}

const KIND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  class: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  interface: { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd" },
  enum: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  record: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  annotation: { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  struct: { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
  trait: { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" },
  function: { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7" },
  type_alias: { bg: "#f0fdfa", text: "#115e59", border: "#5eead4" },
  tagged_union: { bg: "#fdf4ff", text: "#86198f", border: "#e879f9" },
  module: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  constant: { bg: "#fff7ed", text: "#c2410c", border: "#fb923c" },
};

/** Section header matching EndpointPage style: 11px uppercase, 0.08em letter-spacing */
function SectionHeader({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--ds-text-tertiary, #94a3b8)",
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: "1px solid var(--ds-border, #e2e8f0)",
      }}
    >
      {children}
    </h3>
  );
}

export function MemberPage({ data, referenceIndex }: MemberPageProps) {
  const { member, artifact, referencedIn, examples } = data;
  const kindColors = KIND_COLORS[member.kind] || KIND_COLORS.class;

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Libraries", href: "/libraries" },
          { label: artifact.label, href: `/libraries/${slugify(artifact.label)}` },
          { label: member.name },
        ]}
      />

      {/* Member header -- full width */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
          paddingBottom: 16,
          borderBottom: "1px solid var(--ds-border, #e2e8f0)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            background: kindColors.bg,
            color: kindColors.text,
            border: `1px solid ${kindColors.border}`,
            letterSpacing: "0.03em",
          }}
        >
          {member.kind}
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--ds-text-primary, #0f172a)",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          }}
        >
          {member.name}
        </span>
        {member.deprecated && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fcd34d",
              fontWeight: 500,
            }}
          >
            deprecated
          </span>
        )}
        {member.since && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              background: "var(--ds-surface-tertiary, #f1f5f9)",
              color: "var(--ds-text-tertiary, #94a3b8)",
              fontFamily: "var(--font-mono)",
            }}
          >
            since {member.since}
          </span>
        )}
      </div>

      {/* Qualified name */}
      <div
        style={{
          fontSize: 12,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          color: "var(--ds-text-tertiary, #94a3b8)",
          marginBottom: 16,
          marginTop: 8,
        }}
      >
        {member.qualified}
      </div>

      {/* Type hierarchy (extends / implements) */}
      {(member.extends || (member.implements && member.implements.length > 0)) && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid var(--ds-border, #e2e8f0)",
            background: "var(--ds-surface-secondary, #f8fafc)",
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            fontSize: 13,
          }}
        >
          {member.extends && (
            <div>
              <span style={{ color: "var(--ds-text-tertiary, #94a3b8)", marginRight: 6 }}>extends</span>
              <TypeLink type={member.extends} referenceIndex={referenceIndex} />
            </div>
          )}
          {member.implements && member.implements.length > 0 && (
            <div>
              <span style={{ color: "var(--ds-text-tertiary, #94a3b8)", marginRight: 6 }}>implements</span>
              {member.implements.map((impl, i) => (
                <React.Fragment key={impl}>
                  {i > 0 && <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>, </span>}
                  <TypeLink type={impl} referenceIndex={referenceIndex} />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Badges row: visibility, kindCategory, modifiers, tags */}
      {(member.visibility || member.kindCategory || member.modifiers?.length || member.tags?.length) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
          {member.visibility && <Badge>{member.visibility}</Badge>}
          {member.kindCategory && <Badge variant="primary">{member.kindCategory}</Badge>}
          {member.modifiers?.map((m) => <Badge key={m}>{m}</Badge>)}
          {member.tags?.map((t) => <Badge key={t} variant="info">{t}</Badge>)}
        </div>
      )}

      {/* ══════ Two-column split layout ══════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 0,
          marginTop: 8,
        }}
      >
        {/* ══════ LEFT PANEL ══════ */}
        <div style={{ paddingRight: 40 }}>
          {/* Description */}
          {member.description && (
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--ds-text-secondary, #475569)",
                marginBottom: 32,
              }}
            >
              {member.description}
            </p>
          )}

          {/* Type parameters */}
          {member.typeParams && member.typeParams.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionHeader id="type-parameters">Type Parameters</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {member.typeParams.map((tp) => (
                  <code
                    key={tp}
                    style={{
                      display: "inline-block",
                      fontSize: 13,
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      color: "var(--ds-text-primary, #0f172a)",
                      background: "var(--ds-surface-tertiary, #f1f5f9)",
                      padding: "4px 10px",
                      borderRadius: 4,
                    }}
                  >
                    {tp}
                  </code>
                ))}
              </div>
            </section>
          )}

          {/* Constructors */}
          {member.constructors && member.constructors.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionHeader id="constructors">Constructors</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {member.constructors.map((ctor, i) => (
                  <ConstructorBlock key={i} ctor={ctor} memberName={member.name} referenceIndex={referenceIndex} />
                ))}
              </div>
            </section>
          )}

          {/* Methods */}
          {member.methods && member.methods.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionHeader id="methods">Methods ({member.methods.length})</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {member.methods.map((method) => (
                  <MethodBlock key={method.name} method={method} referenceIndex={referenceIndex} />
                ))}
              </div>
            </section>
          )}

          {/* Fields */}
          {member.fields && member.fields.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionHeader id="fields">Fields ({member.fields.length})</SectionHeader>
              <FieldsTable fields={member.fields} referenceIndex={referenceIndex} />
            </section>
          )}

          {/* Enum values */}
          {member.values && member.values.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionHeader id="values">Enum Values ({member.values.length})</SectionHeader>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {member.values.map((v) => (
                  <code
                    key={v}
                    style={{
                      fontSize: 13,
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      color: "var(--ds-text-primary, #0f172a)",
                      background: "var(--ds-surface-tertiary, #f1f5f9)",
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid var(--ds-border, #e2e8f0)",
                    }}
                  >
                    {v}
                  </code>
                ))}
              </div>
            </section>
          )}

          {/* Dependencies */}
          {member.dependencies && member.dependencies.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionHeader id="dependencies">Dependencies ({member.dependencies.length})</SectionHeader>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Name", "Type", "Classification", "Injection", "Required"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "8px 12px 8px 0",
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--ds-text-tertiary, #94a3b8)",
                            borderBottom: "1px solid var(--ds-border, #e2e8f0)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {member.dependencies.map((dep) => (
                      <tr key={dep.name} style={{ borderBottom: "1px solid var(--ds-border-light, #f1f5f9)" }}>
                        <td style={{ padding: "8px 12px 8px 0", fontFamily: "var(--font-mono)", color: "var(--ds-text-primary)" }}>
                          {dep.name}
                        </td>
                        <td style={{ padding: "8px 12px 8px 0" }}>
                          {dep.type ? (
                            <TypeLink type={dep.type} referenceIndex={referenceIndex} />
                          ) : (
                            <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>--</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px 8px 0" }}>
                          {dep.classification ? (
                            <Badge variant="info">{dep.classification}</Badge>
                          ) : (
                            <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>--</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px 8px 0" }}>
                          {dep.injectionMechanism ? (
                            <Badge>{dep.injectionMechanism}</Badge>
                          ) : (
                            <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>--</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px 8px 0" }}>
                          {dep.required !== undefined ? (
                            dep.required ? (
                              <Badge variant="error">required</Badge>
                            ) : (
                              <Badge variant="success">optional</Badge>
                            )
                          ) : (
                            <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Inline examples (from member.examples) */}
          {member.examples && member.examples.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionHeader id="examples">Examples</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {member.examples.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--ds-border, #e2e8f0)",
                    }}
                  >
                    {ex.title && (
                      <div
                        style={{
                          padding: "8px 14px",
                          background: "var(--ds-surface-secondary, #f8fafc)",
                          borderBottom: "1px solid var(--ds-border, #e2e8f0)",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--ds-text-secondary, #475569)",
                        }}
                      >
                        {ex.title}
                      </div>
                    )}
                    <pre
                      style={{
                        margin: 0,
                        padding: 14,
                        background: "var(--ds-code-bg, #0f172a)",
                        overflowX: "auto",
                      }}
                    >
                      <code
                        style={{
                          fontSize: 12.5,
                          lineHeight: 1.65,
                          color: "var(--ds-code-text, #e2e8f0)",
                          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        }}
                      >
                        {ex.code}
                      </code>
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ══════ RIGHT PANEL (sticky) ══════ */}
        <div
          style={{
            position: "sticky",
            top: 68,
            alignSelf: "start",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxHeight: "calc(100vh - 84px)",
            overflowY: "auto",
          }}
        >
          {/* Import / usage snippet */}
          <div
            style={{
              background: "var(--ds-code-bg, #0f172a)",
              borderRadius: 8,
              padding: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                color: "var(--ds-text-tertiary, #64748b)",
                letterSpacing: "0.02em",
                marginBottom: 10,
              }}
            >
              Import
            </div>
            <pre style={{ margin: 0 }}>
              <code
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "var(--ds-code-text, #e2e8f0)",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                }}
              >
                {`import ${member.name};`}
                {"\n"}
                {`// ${member.qualified}`}
              </code>
            </pre>
          </div>

          {/* Language-tabbed examples from data.examples */}
          {examples && Object.keys(examples).length > 0 && (
            <LanguageTabs examples={examples} title="Usage" />
          )}

          {/* ReferencedIn panel */}
          {referencedIn && <ReferencedInPanel data={referencedIn} />}

          {/* Quick nav: Methods list */}
          {member.methods && member.methods.length > 0 && (
            <div
              style={{
                border: "1px solid var(--ds-border, #e2e8f0)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 14px",
                  background: "var(--ds-surface-secondary, #f8fafc)",
                  borderBottom: "1px solid var(--ds-border, #e2e8f0)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--ds-text-tertiary, #94a3b8)",
                  }}
                >
                  Methods
                </span>
              </div>
              <div style={{ padding: "8px 0" }}>
                {member.methods.map((m) => (
                  <a
                    key={m.name}
                    href={`#${m.name}`}
                    style={{
                      display: "block",
                      padding: "4px 14px",
                      fontSize: 12,
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      color: "var(--ds-primary, #6366f1)",
                      textDecoration: "none",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--ds-surface-secondary, #f8fafc)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {m.name}()
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A single constructor block */
function ConstructorBlock({
  ctor,
  memberName,
  referenceIndex,
}: {
  ctor: Constructor;
  memberName: string;
  referenceIndex?: Record<string, string>;
}) {
  const params = ctor.params || [];
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 6,
        border: "1px solid var(--ds-border, #e2e8f0)",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Signature */}
      <code
        style={{
          fontSize: 13,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        {ctor.visibility && (
          <span style={{ color: "#9333ea" }}>{ctor.visibility} </span>
        )}
        <span style={{ fontWeight: 600, color: "var(--ds-text-primary, #0f172a)" }}>{memberName}</span>
        <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>(</span>
        {params.map((p, i) => (
          <React.Fragment key={p.name}>
            {i > 0 && <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>, </span>}
            <span style={{ color: "#059669" }}>{p.type}</span>{" "}
            <span style={{ color: "var(--ds-text-secondary, #475569)" }}>{p.name}</span>
          </React.Fragment>
        ))}
        <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>)</span>
      </code>

      {ctor.description && (
        <p style={{ fontSize: 13, color: "var(--ds-text-secondary, #475569)", marginTop: 8 }}>
          {ctor.description}
        </p>
      )}

      {/* Inline parameters table */}
      {params.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <InlineParamsTable params={params} referenceIndex={referenceIndex} />
        </div>
      )}
    </div>
  );
}

/** A single method block with anchor link */
function MethodBlock({
  method,
  referenceIndex,
}: {
  method: Method;
  referenceIndex?: Record<string, string>;
}) {
  const params = method.params || [];
  return (
    <div
      id={method.name}
      style={{
        padding: "14px 16px",
        borderRadius: 6,
        border: "1px solid var(--ds-border, #e2e8f0)",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Method signature */}
      <div style={{ marginBottom: 6 }}>
        <MethodSignature method={method} />
      </div>

      {/* Endpoint mapping if present */}
      {method.endpointMapping && (
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Badge httpMethod={method.endpointMapping.method}>{method.endpointMapping.method}</Badge>
          <code
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              color: "var(--ds-text-secondary, #475569)",
            }}
          >
            {method.endpointMapping.path}
          </code>
        </div>
      )}

      {/* Description */}
      {method.description && (
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ds-text-secondary, #475569)", marginBottom: 10 }}>
          {method.description}
        </p>
      )}

      {/* Inline parameters table */}
      {params.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <InlineParamsTable params={params} referenceIndex={referenceIndex} />
        </div>
      )}

      {/* Return type */}
      {method.returns && method.returns.type && method.returns.type !== "void" && (
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>Returns: </span>
          <TypeLink type={method.returns.type} referenceIndex={referenceIndex} />
          {method.returns.description && (
            <span style={{ color: "var(--ds-text-secondary, #475569)", marginLeft: 8 }}>
              -- {method.returns.description}
            </span>
          )}
        </div>
      )}

      {/* Throws list */}
      {method.throws && method.throws.length > 0 && (
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: "var(--ds-text-tertiary, #94a3b8)" }}>Throws: </span>
          {method.throws.map((t, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: "var(--ds-text-tertiary)" }}>, </span>}
              <TypeLink type={t.type || "Exception"} referenceIndex={referenceIndex} />
              {t.description && (
                <span style={{ color: "var(--ds-text-secondary, #475569)" }}> -- {t.description}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Since / Deprecated badges */}
      {(method.since || method.deprecated) && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {method.since && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: "var(--ds-surface-tertiary, #f1f5f9)",
                color: "var(--ds-text-tertiary, #94a3b8)",
                fontFamily: "var(--font-mono)",
              }}
            >
              since {method.since}
            </span>
          )}
          {method.deprecated && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fcd34d",
                fontWeight: 500,
              }}
            >
              deprecated
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Inline parameters table rendered directly inside method/constructor blocks */
function InlineParamsTable({
  params,
  referenceIndex,
}: {
  params: { name: string; type: string; required?: boolean; description?: string; default?: string | null }[];
  referenceIndex?: Record<string, string>;
}) {
  return (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Parameter", "Type", "Description"].map((h) => (
            <th
              key={h}
              style={{
                textAlign: "left",
                padding: "6px 10px 6px 0",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ds-text-tertiary, #94a3b8)",
                borderBottom: "1px solid var(--ds-border, #e2e8f0)",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {params.map((p) => (
          <tr key={p.name} style={{ borderBottom: "1px solid var(--ds-border-light, #f1f5f9)" }}>
            <td
              style={{
                padding: "6px 10px 6px 0",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                color: "var(--ds-text-primary, #0f172a)",
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
              {p.required && (
                <span style={{ color: "var(--ds-error, #ef4444)", marginLeft: 2 }}>*</span>
              )}
            </td>
            <td style={{ padding: "6px 10px 6px 0" }}>
              <TypeLink type={p.type} referenceIndex={referenceIndex} />
            </td>
            <td style={{ padding: "6px 10px 6px 0", color: "var(--ds-text-secondary, #475569)" }}>
              {p.description || "--"}
              {p.default !== undefined && p.default !== null && (
                <span style={{ color: "var(--ds-text-tertiary, #94a3b8)", marginLeft: 6 }}>
                  (default: <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{p.default}</code>)
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Fields table for the Fields section */
function FieldsTable({
  fields,
  referenceIndex,
}: {
  fields: Field[];
  referenceIndex?: Record<string, string>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Name", "Type", "Description"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 12px 8px 0",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ds-text-tertiary, #94a3b8)",
                  borderBottom: "1px solid var(--ds-border, #e2e8f0)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name} style={{ borderBottom: "1px solid var(--ds-border-light, #f1f5f9)" }}>
              <td
                style={{
                  padding: "8px 12px 8px 0",
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 13,
                  color: "var(--ds-text-primary, #0f172a)",
                }}
              >
                {field.name}
              </td>
              <td style={{ padding: "8px 12px 8px 0" }}>
                <TypeLink type={field.type} referenceIndex={referenceIndex} />
              </td>
              <td style={{ padding: "8px 12px 8px 0", color: "var(--ds-text-secondary, #475569)" }}>
                {field.description || "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
