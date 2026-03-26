import React from "react";
import type { MemberPageData, Method, Constructor } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { MethodSignature } from "../ui/MethodSignature.js";
import { ParameterTable } from "../ui/ParameterTable.js";
import { CodeBlock } from "../ui/CodeBlock.js";
import { ReferencedInPanel } from "../ui/ReferencedInPanel.js";
import { TypeLink } from "../ui/TypeLink.js";

interface MemberPageProps {
  data: MemberPageData;
  referenceIndex?: Record<string, string>;
}

export function MemberPage({ data, referenceIndex }: MemberPageProps) {
  const { member, artifact, referencedIn } = data;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Libraries", href: "/libraries" },
          { label: artifact.label, href: `/libraries/${slugify(artifact.label)}` },
          { label: member.name },
        ]}
      />

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-text-primary">{member.name}</h1>
        <Badge variant="primary">{member.kind}</Badge>
        {member.deprecated && <Badge variant="warning">deprecated</Badge>}
      </div>

      <p className="text-sm font-mono text-text-tertiary mb-2">{member.qualified}</p>

      {member.description && (
        <p className="text-text-secondary mb-6">{member.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        {member.visibility && <Badge>{member.visibility}</Badge>}
        {member.kindCategory && <Badge variant="primary">{member.kindCategory}</Badge>}
        {member.modifiers?.map((m) => <Badge key={m}>{m}</Badge>)}
        {member.tags?.map((t) => <Badge key={t} variant="info">{t}</Badge>)}
      </div>

      {/* Type hierarchy */}
      {(member.extends || (member.implements && member.implements.length > 0)) && (
        <div className="mb-8 p-4 rounded-lg bg-surface-secondary border border-border">
          {member.extends && (
            <div className="text-sm mb-1">
              <span className="text-text-tertiary">extends</span>{" "}
              <TypeLink type={member.extends} referenceIndex={referenceIndex} />
            </div>
          )}
          {member.implements && member.implements.length > 0 && (
            <div className="text-sm">
              <span className="text-text-tertiary">implements</span>{" "}
              {member.implements.map((impl, i) => (
                <React.Fragment key={impl}>
                  {i > 0 && <span className="text-text-tertiary">, </span>}
                  <TypeLink type={impl} referenceIndex={referenceIndex} />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Constructors */}
      {member.constructors && member.constructors.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="constructors">Constructors</h2>
          {member.constructors.map((ctor, i) => (
            <ConstructorSection key={i} ctor={ctor} referenceIndex={referenceIndex} />
          ))}
        </section>
      )}

      {/* Methods */}
      {member.methods && member.methods.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="methods">
            Methods ({member.methods.length})
          </h2>
          <div className="space-y-6">
            {member.methods.map((method) => (
              <MethodSection key={method.name} method={method} referenceIndex={referenceIndex} />
            ))}
          </div>
        </section>
      )}

      {/* Fields */}
      {member.fields && member.fields.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="fields">Fields</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Name</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Type</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                {member.fields.map((field) => (
                  <tr key={field.name} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-sm">{field.name}</td>
                    <td className="py-2 pr-4"><TypeLink type={field.type} referenceIndex={referenceIndex} /></td>
                    <td className="py-2 text-text-secondary">{field.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Enum values */}
      {member.values && member.values.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="values">Enum Values</h2>
          <div className="flex flex-wrap gap-2">
            {member.values.map((v) => <Badge key={v}>{v}</Badge>)}
          </div>
        </section>
      )}

      {/* Examples */}
      {member.examples && member.examples.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="examples">Examples</h2>
          {member.examples.map((ex, i) => (
            <CodeBlock key={i} code={ex.code} language={ex.language} title={ex.title} />
          ))}
        </section>
      )}

      {/* Dependencies */}
      {member.dependencies && member.dependencies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="dependencies">
            Dependencies ({member.dependencies.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Name</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Type</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Classification</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Injection</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Required</th>
                </tr>
              </thead>
              <tbody>
                {member.dependencies.map((dep) => (
                  <tr key={dep.name} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-sm text-text-primary">{dep.name}</td>
                    <td className="py-2 pr-4">
                      {dep.type ? (
                        <TypeLink type={dep.type} referenceIndex={referenceIndex} />
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {dep.classification ? (
                        <Badge variant="info">{dep.classification}</Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {dep.injectionMechanism ? (
                        <Badge>{dep.injectionMechanism}</Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      {dep.required !== undefined ? (
                        dep.required ? (
                          <Badge variant="error">required</Badge>
                        ) : (
                          <Badge variant="success">optional</Badge>
                        )
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Referenced In */}
      {referencedIn && <ReferencedInPanel data={referencedIn} />}
    </div>
  );
}

function ConstructorSection({ ctor, referenceIndex }: { ctor: Constructor; referenceIndex?: Record<string, string> }) {
  return (
    <div className="p-4 rounded-lg border border-border mb-3">
      {ctor.description && <p className="text-sm text-text-secondary mb-2">{ctor.description}</p>}
      {ctor.params && ctor.params.length > 0 && (
        <ParameterTable params={ctor.params} referenceIndex={referenceIndex} />
      )}
    </div>
  );
}

function MethodSection({ method, referenceIndex }: { method: Method; referenceIndex?: Record<string, string> }) {
  return (
    <div className="p-4 rounded-lg border border-border" id={`method-${method.name}`}>
      <div className="mb-2">
        <MethodSignature method={method} />
      </div>

      {method.endpointMapping && (
        <div className="mb-2">
          <Badge httpMethod={method.endpointMapping.method}>{method.endpointMapping.method}</Badge>
          <code className="ml-2 text-sm text-text-secondary">{method.endpointMapping.path}</code>
        </div>
      )}

      {method.description && (
        <p className="text-sm text-text-secondary mb-3">{method.description}</p>
      )}

      {method.params && method.params.length > 0 && (
        <div className="mb-3">
          <ParameterTable params={method.params} referenceIndex={referenceIndex} />
        </div>
      )}

      {method.returns && method.returns.type && method.returns.type !== "void" && (
        <div className="text-sm mb-2">
          <span className="text-text-tertiary">Returns: </span>
          <TypeLink type={method.returns.type} referenceIndex={referenceIndex} />
          {method.returns.description && (
            <span className="text-text-secondary ml-2">— {method.returns.description}</span>
          )}
        </div>
      )}

      {method.throws && method.throws.length > 0 && (
        <div className="text-sm">
          <span className="text-text-tertiary">Throws: </span>
          {method.throws.map((t, i) => (
            <React.Fragment key={i}>
              {i > 0 && ", "}
              <TypeLink type={t.type || "Exception"} referenceIndex={referenceIndex} />
              {t.description && <span className="text-text-secondary"> — {t.description}</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
