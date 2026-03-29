import React from "react";
import type { DataStorePageData, DataStore, DataStoreMigration } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Tag } from "../ui/Tag.js";

interface DataStorePageProps {
  data: DataStorePageData;
}

const STORE_TYPE_COLORS: Record<string, string> = {
  relational: T.accent,
  document: T.blue,
  "key-value": T.green,
  "message-queue": T.yellow,
  cache: T.green,
  search: T.blue,
  graph: T.accent,
};

export function DataStorePage({ data }: DataStorePageProps) {
  const { dataStores, artifact } = data;

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
        Data Stores
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        Storage backends used by {artifact.label}.
      </p>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
        {dataStores.map((store) => (
          <DataStoreCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  );
}

function DataStoreCard({ store }: { store: DataStore }) {
  const typeColor = store.type
    ? STORE_TYPE_COLORS[store.type] || T.accent
    : T.accent;

  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 10,
        border: `1px solid ${T.surfaceBorder}`,
        background: T.cardBg,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 650,
            color: T.text,
          }}
        >
          {store.name || store.id}
        </span>
        {store.type && <Tag color={typeColor}>{store.type}</Tag>}
        {store.migrationTool && <Tag color={T.blue}>{store.migrationTool}</Tag>}
      </div>

      {store.schemaSource && (
        <p
          style={{
            fontSize: 11,
            color: T.textDim,
            margin: "0 0 12px",
          }}
        >
          Schema source:{" "}
          <code style={{ fontFamily: T.mono, color: T.textMuted, fontSize: 11 }}>
            {store.schemaSource}
          </code>
        </p>
      )}

      {/* Tables / Collections */}
      {store.tables && store.tables.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              marginBottom: 6,
            }}
          >
            Tables ({store.tables.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {store.tables.map((table) => (
              <code
                key={table}
                style={{
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: T.surface,
                  fontSize: 12,
                  fontFamily: T.mono,
                  color: T.textMuted,
                  border: `1px solid ${T.surfaceBorder}`,
                }}
              >
                {table}
              </code>
            ))}
          </div>
        </section>
      )}

      {/* Key Patterns */}
      {store.keyPatterns && store.keyPatterns.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              marginBottom: 6,
            }}
          >
            Key Patterns
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
            {store.keyPatterns.map((pattern, i) => (
              <code
                key={i}
                style={{
                  display: "block",
                  padding: "5px 10px",
                  borderRadius: 4,
                  background: T.surface,
                  fontSize: 12,
                  fontFamily: T.mono,
                  color: T.textMuted,
                  border: `1px solid ${T.surfaceBorder}`,
                }}
              >
                {pattern.pattern}
                {pattern.type ? ` (${pattern.type})` : ""}
                {pattern.ttl ? ` TTL: ${pattern.ttl}` : ""}
              </code>
            ))}
          </div>
        </section>
      )}

      {/* Topics */}
      {store.topics && store.topics.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              marginBottom: 6,
            }}
          >
            Topics
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {store.topics.map((topic) => (
              <Tag key={topic.name} color={T.blue}>
                {topic.name}
              </Tag>
            ))}
          </div>
        </section>
      )}

      {/* Buckets */}
      {store.buckets && store.buckets.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              marginBottom: 6,
            }}
          >
            Buckets
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {store.buckets.map((bucket) => (
              <Tag key={bucket.name} color={T.accent}>
                {bucket.name}
              </Tag>
            ))}
          </div>
        </section>
      )}

      {/* Migration Timeline */}
      {store.migrations && store.migrations.length > 0 && (
        <section>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              marginBottom: 8,
            }}
          >
            Migrations ({store.migrations.length})
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
                  <th
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
                    Version
                  </th>
                  <th
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
                    Description
                  </th>
                  <th
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
                    Date
                  </th>
                  <th
                    style={{
                      textAlign: "left" as const,
                      padding: "6px 0",
                      color: T.textDim,
                      fontWeight: 600,
                      fontSize: 10,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Tables
                  </th>
                </tr>
              </thead>
              <tbody>
                {store.migrations.map((migration) => (
                  <MigrationRow key={migration.version} migration={migration} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MigrationRow({ migration }: { migration: DataStoreMigration }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.surfaceBorder}50` }}>
      <td
        style={{
          padding: "6px 12px 6px 0",
          fontFamily: T.mono,
          fontSize: 12,
          color: T.text,
        }}
      >
        {migration.version}
      </td>
      <td
        style={{
          padding: "6px 12px 6px 0",
          color: T.textMuted,
          fontSize: 12,
        }}
      >
        {migration.description || "\u2014"}
      </td>
      <td
        style={{
          padding: "6px 12px 6px 0",
          color: T.textDim,
          fontSize: 11,
        }}
      >
        {migration.date || "\u2014"}
      </td>
      <td style={{ padding: "6px 0" }}>
        {migration.tables && migration.tables.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
            {migration.tables.map((t) => (
              <code
                key={t}
                style={{
                  fontSize: 11,
                  fontFamily: T.mono,
                  color: T.textMuted,
                }}
              >
                {t}
              </code>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>{"\u2014"}</span>
        )}
      </td>
    </tr>
  );
}
