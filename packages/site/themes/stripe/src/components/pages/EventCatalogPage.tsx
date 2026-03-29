import React from "react";
import type { EventCatalogPageData } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Tag } from "../ui/Tag.js";

interface EventCatalogPageProps {
  data: EventCatalogPageData;
}

export function EventCatalogPage({ data }: EventCatalogPageProps) {
  const { events, artifact } = data;

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
        Event Catalog
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        All documented events from {artifact.label}
      </p>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
        {events.map((event) => (
          <div
            key={event.name}
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
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  color: T.text,
                }}
              >
                {event.name}
              </span>
              {event.deliveryGuarantee && (
                <Tag color={T.blue}>{event.deliveryGuarantee}</Tag>
              )}
            </div>

            {event.description && (
              <p
                style={{
                  fontSize: 13,
                  color: T.textMuted,
                  lineHeight: 1.6,
                  margin: "0 0 10px",
                }}
              >
                {event.description}
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {event.trigger && (
                <div>
                  <span style={{ color: T.textDim }}>Trigger: </span>
                  <span style={{ color: T.textMuted }}>{event.trigger}</span>
                </div>
              )}
              {event.channel && (
                <div>
                  <span style={{ color: T.textDim }}>Channel: </span>
                  <code
                    style={{
                      fontFamily: T.mono,
                      color: T.textMuted,
                      fontSize: 12,
                    }}
                  >
                    {event.channel}
                  </code>
                </div>
              )}
              {event.retryPolicy && (
                <div>
                  <span style={{ color: T.textDim }}>Retry: </span>
                  <span style={{ color: T.textMuted }}>{event.retryPolicy}</span>
                </div>
              )}
              {event.since && (
                <div>
                  <span style={{ color: T.textDim }}>Since: </span>
                  <span style={{ color: T.textMuted }}>{event.since}</span>
                </div>
              )}
            </div>

            {event.payload &&
              event.payload.fields &&
              event.payload.fields.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.textDim,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                      marginBottom: 8,
                    }}
                  >
                    Payload {event.payload.type ? `\u2014 ${event.payload.type}` : ""}
                  </div>
                  <table
                    style={{
                      width: "100%",
                      fontSize: 13,
                      borderCollapse: "collapse" as const,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${T.surfaceBorder}`,
                        }}
                      >
                        <th
                          style={{
                            textAlign: "left" as const,
                            padding: "4px 10px 4px 0",
                            color: T.textDim,
                            fontWeight: 600,
                            fontSize: 10,
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.04em",
                          }}
                        >
                          Field
                        </th>
                        <th
                          style={{
                            textAlign: "left" as const,
                            padding: "4px 10px 4px 0",
                            color: T.textDim,
                            fontWeight: 600,
                            fontSize: 10,
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.04em",
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            textAlign: "left" as const,
                            padding: "4px 0",
                            color: T.textDim,
                            fontWeight: 600,
                            fontSize: 10,
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.04em",
                          }}
                        >
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.payload.fields.map((f) => (
                        <tr
                          key={f.name}
                          style={{
                            borderBottom: `1px solid ${T.surfaceBorder}50`,
                          }}
                        >
                          <td
                            style={{
                              padding: "4px 10px 4px 0",
                              fontFamily: T.mono,
                              fontSize: 12,
                              color: T.text,
                            }}
                          >
                            {f.name}
                          </td>
                          <td
                            style={{
                              padding: "4px 10px 4px 0",
                              fontFamily: T.mono,
                              fontSize: 12,
                              color: T.accent,
                            }}
                          >
                            {f.type}
                          </td>
                          <td
                            style={{
                              padding: "4px 0",
                              color: T.textMuted,
                              fontSize: 12,
                            }}
                          >
                            {f.description || "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
