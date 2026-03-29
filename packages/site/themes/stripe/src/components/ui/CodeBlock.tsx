"use client";

import React, { useState, useEffect } from "react";
import { T } from "../../lib/tokens.js";
import { getHighlighter } from "../../lib/highlighter.js";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  mode?: "simple" | "shiki";
}

function getLineColor(line: string): string {
  if (/^\s*(\/\/|#|<!--|--)/.test(line)) return T.textDim;
  if (/^\s*@/.test(line)) return "#93c5fd";
  if (/^\s*</.test(line) && !line.includes("=")) return T.pink;
  if (/\b(assert\w+)\b/.test(line)) return T.yellow;
  if (
    /\b(import|from|const|var|let|def|class|public|private|void|return|new|await|async|if|else|for|try|catch|throw|throws|package|interface|extends|implements|static|final)\b/.test(
      line,
    )
  )
    return T.accentText;
  if (/["']/.test(line)) return T.green;
  return T.text;
}

export function CodeBlock({
  code,
  language = "java",
  title,
  showLineNumbers = false,
  mode = "simple",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");

  useEffect(() => {
    if (mode !== "shiki") return;
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      const loadedLangs = hl.getLoadedLanguages();
      const lang = loadedLangs.includes(language as any) ? language : "text";
      const html = hl.codeToHtml(code, { lang, theme: "github-dark" });
      setHighlightedHtml(html);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, mode]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        borderRadius: 9,
        overflow: "hidden",
        border: `1px solid ${T.codeBorder}`,
        background: T.codeBg,
      }}
    >
      {(title || language) && (
        <div
          style={{
            padding: "8px 14px",
            borderBottom: `1px solid ${T.codeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}
          >
            {title || ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {language && (
              <span
                style={{
                  fontSize: 10,
                  color: T.textFaint,
                  fontFamily: T.mono,
                }}
              >
                {language}
              </span>
            )}
            <button
              onClick={handleCopy}
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

      {mode === "shiki" && highlightedHtml ? (
        <div
          style={{
            padding: "14px 16px",
            overflowX: "auto",
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            style={{
              fontSize: 12.5,
              lineHeight: 1.7,
              fontFamily: T.mono,
            }}
          />
        </div>
      ) : (
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
            const c = getLineColor(ln);
            return (
              <div key={i} style={{ color: c, minHeight: 18 }}>
                {showLineNumbers && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 32,
                      textAlign: "right",
                      marginRight: 16,
                      color: T.textFaint,
                      userSelect: "none",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                {ln || " "}
              </div>
            );
          })}
        </pre>
      )}
    </div>
  );
}
