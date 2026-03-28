"use client";

import React, { useState, useEffect } from "react";
import { getHighlighter } from "../../lib/highlighter.js";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = "java", title, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      const loadedLangs = hl.getLoadedLanguages();
      const lang = loadedLangs.includes(language as any) ? language : "text";
      const html = hl.codeToHtml(code, { lang, theme: "github-dark" });
      setHighlightedHtml(html);
    });
    return () => { cancelled = true; };
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--ds-code-border, #1e293b)" }}>
      {(title || language) && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid var(--ds-code-border, #1e293b)",
          background: "var(--ds-code-surface, #0c1222)",
        }}>
          <span style={{
            fontSize: 12,
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            color: "var(--ds-text-tertiary, #94a3b8)",
            letterSpacing: "0.02em",
          }}>
            {title || language}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? "#166534" : "transparent",
              border: `1px solid ${copied ? "#22c55e" : "#334155"}`,
              borderRadius: 4,
              padding: "2px 10px",
              cursor: "pointer",
              color: copied ? "#4ade80" : "var(--ds-text-tertiary, #94a3b8)",
              fontSize: 11,
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <div style={{
        background: "var(--ds-code-bg, #0f172a)",
        padding: 16,
        overflowX: "auto",
      }}>
        {highlightedHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            className="shiki-container"
            style={{
              fontSize: 12.5,
              lineHeight: 1.65,
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          />
        ) : (
          <pre style={{ margin: 0 }}>
            <code style={{
              fontSize: 12.5,
              lineHeight: 1.65,
              color: "var(--ds-code-text, #e2e8f0)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}>
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
