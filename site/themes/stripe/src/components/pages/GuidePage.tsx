"use client";

import React from "react";
import Markdoc, { type RenderableTreeNode } from "@markdoc/markdoc";
import type { GuidePageData } from "@docspec/core";
import { parseMarkdoc, extractToc, type TocEntry } from "../../lib/markdoc-config.js";
import { CodeBlock } from "../ui/CodeBlock.js";

interface GuidePageProps {
  data: GuidePageData;
}

const components: Record<string, React.FC<any>> = {
  Heading: ({ id, level, children }) => {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    const styles: Record<number, React.CSSProperties> = {
      1: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 0, marginBottom: 16, color: "var(--ds-text-primary)" },
      2: { fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginTop: 40, marginBottom: 12, color: "var(--ds-text-primary)", paddingBottom: 8, borderBottom: "1px solid var(--ds-border, #e2e8f0)" },
      3: { fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 8, color: "var(--ds-text-primary)" },
      4: { fontSize: 15, fontWeight: 600, marginTop: 24, marginBottom: 8, color: "var(--ds-text-secondary)" },
    };
    return <Tag id={id} style={styles[level] || styles[4]}>{children}</Tag>;
  },

  Callout: ({ type, title, children }) => {
    const colors: Record<string, { bg: string; border: string; icon: string }> = {
      note: { bg: "#eff6ff", border: "#3b82f6", icon: "\u2139" },
      warning: { bg: "#fffbeb", border: "#f59e0b", icon: "\u26A0" },
      tip: { bg: "#f0fdf4", border: "#22c55e", icon: "\uD83D\uDCA1" },
      danger: { bg: "#fef2f2", border: "#ef4444", icon: "\uD83D\uDEA8" },
    };
    const c = colors[type] || colors.note;
    return (
      <div style={{
        padding: "12px 16px", margin: "16px 0", borderRadius: 6,
        background: c.bg, borderLeft: `3px solid ${c.border}`,
      }}>
        {title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "var(--ds-text-primary)" }}>{c.icon} {title}</div>}
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ds-text-secondary)" }}>{children}</div>
      </div>
    );
  },

  CodeBlock: ({ language, content, children }) => {
    const code = content || (typeof children === 'string' ? children : '');
    return <CodeBlock code={code} language={language} />;
  },
};

export function GuidePage({ data }: GuidePageProps) {
  const { content, frontmatter } = data;
  const title = (frontmatter.title as string) || "Guide";
  const toc = extractToc(content);
  const rendered = parseMarkdoc(content);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 40 }}>
      {/* Main content */}
      <article style={{
        maxWidth: 720,
        fontSize: 15,
        lineHeight: 1.75,
        color: "var(--ds-text-secondary, #475569)",
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--ds-text-primary, #0f172a)",
          marginBottom: 8,
        }}>
          {title}
        </h1>

        {frontmatter.description && (
          <p style={{ fontSize: 17, color: "var(--ds-text-tertiary)", marginBottom: 32 }}>
            {frontmatter.description as string}
          </p>
        )}

        <div>
          {Markdoc.renderers.react(rendered, React, { components })}
        </div>
      </article>

      {/* Table of Contents */}
      {toc.length > 0 && (
        <nav style={{
          position: "sticky",
          top: 68,
          alignSelf: "start",
          maxHeight: "calc(100vh - 84px)",
          overflowY: "auto",
          paddingLeft: 16,
          borderLeft: "1px solid var(--ds-border, #e2e8f0)",
        }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ds-text-tertiary, #94a3b8)",
            marginBottom: 12,
          }}>
            On this page
          </div>
          {toc.filter(e => e.level <= 3).map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              style={{
                display: "block",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--ds-text-secondary, #475569)",
                textDecoration: "none",
                padding: "3px 0",
                paddingLeft: entry.level > 2 ? 12 : 0,
                transition: "color 0.15s ease",
              }}
            >
              {entry.text}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
