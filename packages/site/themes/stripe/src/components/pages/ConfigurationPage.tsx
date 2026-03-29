import React from "react";
import type { ConfigurationPageData, ConfigurationProperty } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Tag } from "../ui/Tag.js";

interface ConfigurationPageProps {
  data: ConfigurationPageData;
}

export function ConfigurationPage({ data }: ConfigurationPageProps) {
  const { properties, artifact } = data;

  const grouped = new Map<string, ConfigurationProperty[]>();
  for (const prop of properties) {
    const source = prop.source || "Other";
    if (!grouped.has(source)) {
      grouped.set(source, []);
    }
    grouped.get(source)!.push(prop);
  }

  const groups = Array.from(grouped.entries());

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
        Configuration
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 4px",
        }}
      >
        Configuration properties for {artifact.label}.
      </p>
      <p
        style={{
          fontSize: 11,
          color: T.textDim,
          margin: "0 0 24px",
        }}
      >
        {properties.length} propert{properties.length === 1 ? "y" : "ies"}{" "}
        across {groups.length} source{groups.length !== 1 ? "s" : ""}
      </p>

      {groups.map(([source, props]) => (
        <section key={source} style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <h2
              id={`source-${slugify(source)}`}
              style={{
                fontSize: 16,
                fontWeight: 650,
                color: T.text,
                margin: 0,
              }}
            >
              {source}
            </h2>
            <Tag color={T.blue}>{props.length}</Tag>
          </div>

          <div style={{ overflowX: "auto" as const }}>
            <table
              style={{
                width: "100%",
                fontSize: 13,
                borderCollapse: "collapse" as const,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.surfaceBorder}` }}>
                  {["Key", "Type", "Default", "Environment", "Description"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left" as const,
                          padding: "6px 12px 6px 0",
                          color: T.textDim,
                          fontWeight: 600,
                          fontSize: 10,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {props.map((prop) => (
                  <PropertyRow key={prop.key} property={prop} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function PropertyRow({ property }: { property: ConfigurationProperty }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.surfaceBorder}50` }}>
      <td style={{ padding: "6px 12px 6px 0" }}>
        <code
          style={{
            fontFamily: T.mono,
            fontSize: 12,
            color: T.text,
          }}
        >
          {property.key}
        </code>
      </td>
      <td style={{ padding: "6px 12px 6px 0" }}>
        {property.type ? (
          <code
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              color: T.textMuted,
            }}
          >
            {property.type}
          </code>
        ) : (
          <span style={{ color: T.textDim }}>{"\u2014"}</span>
        )}
      </td>
      <td style={{ padding: "6px 12px 6px 0" }}>
        {property.default ? (
          <code
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              color: T.textMuted,
            }}
          >
            {property.default}
          </code>
        ) : (
          <span style={{ color: T.textDim }}>{"\u2014"}</span>
        )}
      </td>
      <td style={{ padding: "6px 12px 6px 0" }}>
        {property.environment ? (
          <Tag color={T.accent}>{property.environment}</Tag>
        ) : (
          <span style={{ color: T.textDim }}>{"\u2014"}</span>
        )}
      </td>
      <td style={{ padding: "6px 0" }}>
        <div>
          <span style={{ color: T.textMuted, fontSize: 12 }}>
            {property.description || "\u2014"}
          </span>
          {property.validRange && (
            <div style={{ marginTop: 3, fontSize: 11, color: T.textDim }}>
              {property.validRange.min !== undefined &&
                property.validRange.max !== undefined && (
                  <span>
                    Range: {property.validRange.min}\u2013
                    {property.validRange.max}
                  </span>
                )}
            </div>
          )}
          {property.affectsFlow && (
            <div style={{ marginTop: 3, fontSize: 11, color: T.textDim }}>
              Affects flow:{" "}
              <span style={{ fontWeight: 600 }}>
                {Array.isArray(property.affectsFlow)
                  ? property.affectsFlow.join(", ")
                  : property.affectsFlow}
              </span>
            </div>
          )}
          {property.usedBy && property.usedBy.length > 0 && (
            <div
              style={{
                marginTop: 4,
                display: "flex",
                flexWrap: "wrap" as const,
                gap: 4,
              }}
            >
              {property.usedBy.map((u) => (
                <Tag key={u} color={T.accentText}>
                  {u}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
