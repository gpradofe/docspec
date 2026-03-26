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
    <div className="rounded-lg border border-border overflow-hidden bg-gray-950">
      {(title || language) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
          <span className="text-xs font-mono text-gray-400">
            {title || language}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-gray-200 leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}
