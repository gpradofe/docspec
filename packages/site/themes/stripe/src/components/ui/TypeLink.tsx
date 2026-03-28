import React from "react";

interface TypeLinkProps {
  type: string;
  referenceIndex?: Record<string, string>;
}

/** Simplify a fully-qualified Java type for display. */
function simplifyType(type: string): string {
  // Strip common prefixes: java.lang.String → String, java.util.List → List
  return type
    .replace(/java\.lang\./g, "")
    .replace(/java\.util\./g, "")
    .replace(/\b[a-z]+\.[a-z]+\.[a-z]+\./g, ""); // collapse deep packages
}

/** Extract the base type from generics for linking: List<Foo> → Foo */
function extractLinkableType(type: string): string | null {
  const genericMatch = type.match(/<([^<>]+)>/);
  if (genericMatch) return genericMatch[1];
  return type;
}

export function TypeLink({ type, referenceIndex }: TypeLinkProps) {
  const display = simplifyType(type);

  if (!referenceIndex) {
    return <code className="text-sm font-mono text-primary-600">{display}</code>;
  }

  const linkableType = extractLinkableType(type);
  const url = linkableType ? referenceIndex[linkableType] : undefined;

  if (url) {
    return (
      <a href={`/${url}`} className="text-sm font-mono text-primary-600 hover:text-primary-800 hover:underline">
        {display}
      </a>
    );
  }

  return <code className="text-sm font-mono text-text-secondary">{display}</code>;
}
