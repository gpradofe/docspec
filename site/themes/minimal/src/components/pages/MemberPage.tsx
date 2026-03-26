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
      <Breadcrumb items={[{ label: artifact.label, href: `/libraries/${slugify(artifact.label)}` }, { label: member.name }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">{member.name}</h1>
      <p className="text-sm font-mono text-text-tertiary mb-2">{member.qualified}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge variant="primary">{member.kind}</Badge>
        {member.deprecated && <Badge variant="warning">deprecated</Badge>}
        {member.visibility && <Badge>{member.visibility}</Badge>}
        {member.kindCategory && <Badge variant="primary">{member.kindCategory}</Badge>}
      </div>

      {member.description && <p className="text-text-secondary mb-6 leading-relaxed">{member.description}</p>}

      {(member.extends || (member.implements && member.implements.length > 0)) && (
        <div className="mb-6 text-sm">
          {member.extends && <div><span className="text-text-tertiary">extends</span> <TypeLink type={member.extends} referenceIndex={referenceIndex} /></div>}
          {member.implements && member.implements.length > 0 && (
            <div><span className="text-text-tertiary">implements</span>{" "}
              {member.implements.map((impl, i) => (
                <React.Fragment key={impl}>{i > 0 && ", "}<TypeLink type={impl} referenceIndex={referenceIndex} /></React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {member.constructors && member.constructors.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3" id="constructors">Constructors</h2>
          {member.constructors.map((ctor, i) => (
            <div key={i} className="border-b border-border py-3">
              {ctor.description && <p className="text-sm text-text-secondary mb-2">{ctor.description}</p>}
              {ctor.params && ctor.params.length > 0 && <ParameterTable params={ctor.params} referenceIndex={referenceIndex} />}
            </div>
          ))}
        </section>
      )}

      {member.methods && member.methods.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3" id="methods">Methods ({member.methods.length})</h2>
          <div className="divide-y divide-border">
            {member.methods.map((method) => <MethodSection key={method.name} method={method} referenceIndex={referenceIndex} />)}
          </div>
        </section>
      )}

      {member.fields && member.fields.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3" id="fields">Fields</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-text-tertiary text-xs">Name</th>
                <th className="text-left py-2 pr-4 text-text-tertiary text-xs">Type</th>
                <th className="text-left py-2 text-text-tertiary text-xs">Description</th>
              </tr></thead>
              <tbody>
                {member.fields.map((field) => (
                  <tr key={field.name} className="border-b border-border">
                    <td className="py-2 pr-4 font-mono text-sm">{field.name}</td>
                    <td className="py-2 pr-4"><TypeLink type={field.type} referenceIndex={referenceIndex} /></td>
                    <td className="py-2 text-text-secondary">{field.description || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {member.values && member.values.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3" id="values">Enum Values</h2>
          <div className="flex flex-wrap gap-1.5">{member.values.map((v) => <Badge key={v}>{v}</Badge>)}</div>
        </section>
      )}

      {member.examples && member.examples.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3" id="examples">Examples</h2>
          {member.examples.map((ex, i) => <CodeBlock key={i} code={ex.code} language={ex.language} title={ex.title} />)}
        </section>
      )}

      {referencedIn && <ReferencedInPanel data={referencedIn} />}
    </div>
  );
}

function MethodSection({ method, referenceIndex }: { method: Method; referenceIndex?: Record<string, string> }) {
  return (
    <div className="py-4" id={`method-${method.name}`}>
      <MethodSignature method={method} />
      {method.description && <p className="text-sm text-text-secondary mt-2 mb-3">{method.description}</p>}
      {method.params && method.params.length > 0 && <ParameterTable params={method.params} referenceIndex={referenceIndex} />}
      {method.returns && method.returns.type && method.returns.type !== "void" && (
        <div className="text-sm mt-2">
          <span className="text-text-tertiary">Returns: </span>
          <TypeLink type={method.returns.type} referenceIndex={referenceIndex} />
          {method.returns.description && <span className="text-text-secondary ml-1">&mdash; {method.returns.description}</span>}
        </div>
      )}
    </div>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
