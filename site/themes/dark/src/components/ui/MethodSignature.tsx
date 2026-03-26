import React from "react";
import type { Method } from "@docspec/core";

interface MethodSignatureProps {
  method: Method;
  className?: string;
}

export function MethodSignature({ method, className = "" }: MethodSignatureProps) {
  const visibility = method.visibility || "public";
  const modifiers = method.modifiers?.join(" ") || "";
  const returnType = method.returns?.type || "void";
  const params = method.params || [];

  return (
    <code className={`text-sm font-mono ${className}`}>
      <span className="text-purple-400">{visibility}</span>
      {modifiers && <span className="text-blue-400"> {modifiers}</span>}
      {" "}
      <span className="text-emerald-400">{returnType}</span>
      {" "}
      <span className="text-text-primary font-semibold">{method.name}</span>
      <span className="text-text-tertiary">(</span>
      {params.map((p, i) => (
        <React.Fragment key={p.name}>
          {i > 0 && <span className="text-text-tertiary">, </span>}
          <span className="text-emerald-400">{p.type.replace(/java\.lang\./g, "").replace(/java\.util\./g, "")}</span>
          {" "}
          <span className="text-text-secondary">{p.name}</span>
        </React.Fragment>
      ))}
      <span className="text-text-tertiary">)</span>
    </code>
  );
}
