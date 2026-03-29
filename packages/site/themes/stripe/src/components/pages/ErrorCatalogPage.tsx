"use client";

import React, { useState } from "react";
import type { ErrorCatalogPageData } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Tag } from "../ui/Tag.js";

interface ErrorCatalogPageProps {
  data: ErrorCatalogPageData;
}

export function ErrorCatalogPage({ data }: ErrorCatalogPageProps) {
  const [filter, setFilter] = useState("");
  const { errors, artifact } = data;

  const filtered = filter
    ? errors.filter(
        (e) =>
          e.code.toLowerCase().includes(filter.toLowerCase()) ||
          e.description?.toLowerCase().includes(filter.toLowerCase()),
      )
    : errors;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 6px",
        }}
      >
        Error Catalog
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        All documented errors from {artifact.label}
      </p>

      <input
        type="text"
        placeholder="Filter errors..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 14px",
          marginBottom: 24,
          borderRadius: 8,
          border: `1px solid ${T.surfaceBorder}`,
          background: T.cardBg,
          fontSize: 13,
          color: T.text,
          outline: "none",
          fontFamily: T.sans,
          boxSizing: "border-box" as const,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
        {filtered.map((error) => (
          <div
            key={error.code}
            id={`error-${error.code}`}
            style={{
              padding: "14px 16px",
              borderRadius: 8,
              border: `1px solid ${T.surfaceBorder}`,
              background: T.cardBg,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <code
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: T.mono,
                  color: T.red,
                }}
              >
                {error.code}
              </code>
              {error.httpStatus && (
                <Tag color={T.red}>{error.httpStatus}</Tag>
              )}
            </div>

            {error.description && (
              <p
                style={{
                  fontSize: 13,
                  color: T.textMuted,
                  lineHeight: 1.6,
                  margin: "0 0 10px",
                }}
              >
                {error.description}
              </p>
            )}

            {error.causes && error.causes.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.textDim,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Causes
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    fontSize: 13,
                    color: T.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  {error.causes.map((cause, i) => (
                    <li key={i}>{cause}</li>
                  ))}
                </ul>
              </div>
            )}

            {error.resolution && (
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.textDim,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Resolution
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: T.textMuted,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {error.resolution}
                </p>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap" as const,
                gap: 12,
                fontSize: 11,
                color: T.textDim,
              }}
            >
              {error.thrownBy && error.thrownBy.length > 0 && (
                <span>Thrown by: {error.thrownBy.join(", ")}</span>
              )}
              {error.endpoints && error.endpoints.length > 0 && (
                <span>Endpoints: {error.endpoints.join(", ")}</span>
              )}
              {error.since && <span>Since: {error.since}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
