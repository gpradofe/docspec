"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext.js";
import { getHighlighter } from "../../lib/highlighter.js";

interface LanguageTabsProps {
  examples: Record<string, string>;
  defaultLanguage?: string;
  title?: string;
}

const LANG_LABELS: Record<string, string> = {
  curl: "cURL",
  java: "Java",
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  go: "Go",
  rust: "Rust",
  csharp: "C#",
  bash: "Shell",
  ruby: "Ruby",
  php: "PHP",
  kotlin: "Kotlin",
  swift: "Swift",
};

export function LanguageTabs({ examples, title }: LanguageTabsProps) {
  const { language, setLanguage } = useLanguage();
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const languages = Object.keys(examples);
  const active = languages.includes(language) ? language : languages[0];
  const activeCode = examples[active] ?? "";

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      const loadedLangs = hl.getLoadedLanguages();
      const lang = loadedLangs.includes(active as any) ? active : "text";
      const html = hl.codeToHtml(activeCode, { lang, theme: "github-dark" });
      setHighlightedHtml(html);
    });
    return () => { cancelled = true; };
  }, [activeCode, active]);

  if (languages.length === 0) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--ds-code-border, #1e293b)" }}>
      {/* Tab bar with language tabs and copy button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        background: "var(--ds-code-surface, #0c1222)",
        borderBottom: "1px solid var(--ds-code-border, #1e293b)",
        padding: "0 8px",
        overflowX: "auto",
      }}>
        {title && (
          <span style={{
            fontSize: 11,
            color: "var(--ds-text-tertiary, #64748b)",
            padding: "8px 12px 8px 8px",
            borderRight: "1px solid var(--ds-code-border, #1e293b)",
            marginRight: 4,
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            whiteSpace: "nowrap",
          }}>
            {title}
          </span>
        )}
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            style={{
              padding: "8px 12px",
              fontSize: 12,
              cursor: "pointer",
              background: lang === active ? "var(--ds-code-border, #1e293b)" : "transparent",
              color: lang === active ? "var(--ds-code-text, #e2e8f0)" : "var(--ds-text-tertiary, #64748b)",
              border: "none",
              borderBottom: lang === active ? "2px solid var(--ds-primary, #6366f1)" : "2px solid transparent",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {LANG_LABELS[lang] || lang}
          </button>
        ))}
        <div style={{ flex: 1 }} />
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
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code content */}
      <div style={{ background: "var(--ds-code-bg, #0f172a)", padding: 16, overflowX: "auto" }}>
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
              {activeCode}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
