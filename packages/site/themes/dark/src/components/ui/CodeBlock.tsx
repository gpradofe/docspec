"use client";

import React, { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = "java", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-surface">
      {(title || language) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-secondary">
          <span className="text-xs font-mono text-text-tertiary">
            {title || language}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-text-primary leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}
