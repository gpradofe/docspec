import React from "react";
import type { SecurityPageData, SecurityEndpointRule } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Tag } from "../ui/Tag.js";

interface SecurityPageProps {
  data: SecurityPageData;
}

export function SecurityPage({ data }: SecurityPageProps) {
  const { security, artifact } = data;
  const endpoints = security.endpoints || [];
  const roles = security.roles || [];
  const scopes = security.scopes || [];

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
        Security
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        Authentication, authorization, and access control for {artifact.label}.
      </p>

      {/* Auth Mechanism Card */}
      {security.authMechanism && (
        <section style={{ marginBottom: 24 }}>
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
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 650,
                  color: T.text,
                }}
              >
                Authentication
              </span>
              <Tag color={T.accent}>{security.authMechanism}</Tag>
            </div>
            <p
              style={{
                fontSize: 13,
                color: T.textMuted,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              This service uses{" "}
              <span style={{ fontWeight: 600, color: T.text }}>
                {security.authMechanism}
              </span>{" "}
              as its primary authentication mechanism.
            </p>
          </div>
        </section>
      )}

      {/* Roles & Scopes */}
      {(roles.length > 0 || scopes.length > 0) && (
        <section style={{ marginBottom: 24 }}>
          <h2
            id="roles-scopes"
            style={{
              fontSize: 16,
              fontWeight: 650,
              color: T.text,
              margin: "0 0 12px",
            }}
          >
            Roles & Scopes
          </h2>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 8,
              border: `1px solid ${T.surfaceBorder}`,
              background: T.cardBg,
            }}
          >
            {roles.length > 0 && (
              <div style={{ marginBottom: scopes.length > 0 ? 10 : 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.textDim,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Roles
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap" as const,
                    gap: 6,
                  }}
                >
                  {roles.map((role) => (
                    <Tag key={role} color={T.accent}>
                      {role}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            {scopes.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.textDim,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Scopes
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap" as const,
                    gap: 6,
                  }}
                >
                  {scopes.map((scope) => (
                    <Tag key={scope} color={T.blue}>
                      {scope}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Endpoint Rules */}
      {endpoints.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2
            id="endpoint-rules"
            style={{
              fontSize: 16,
              fontWeight: 650,
              color: T.text,
              margin: "0 0 12px",
            }}
          >
            Endpoint Rules ({endpoints.length})
          </h2>
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
                  {["Path", "Rules", "Access", "Rate Limit"].map((h) => (
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
                  ))}
                </tr>
              </thead>
              <tbody>
                {endpoints.map((rule) => (
                  <EndpointRuleRow key={rule.path} rule={rule} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function EndpointRuleRow({ rule }: { rule: SecurityEndpointRule }) {
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
          {rule.path}
        </code>
      </td>
      <td style={{ padding: "6px 12px 6px 0" }}>
        {rule.rules && rule.rules.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
            {rule.rules.map((r) => (
              <Tag key={r} color={T.accentText}>
                {r}
              </Tag>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>{"\u2014"}</span>
        )}
      </td>
      <td style={{ padding: "6px 12px 6px 0" }}>
        {rule.public ? (
          <Tag color={T.green}>public</Tag>
        ) : (
          <Tag color={T.yellow}>protected</Tag>
        )}
      </td>
      <td style={{ padding: "6px 0" }}>
        {rule.rateLimit ? (
          <span style={{ fontSize: 12, color: T.textMuted }}>
            {rule.rateLimit.requests && <span>{rule.rateLimit.requests} req</span>}
            {rule.rateLimit.window && <span>/{rule.rateLimit.window}</span>}
          </span>
        ) : (
          <span style={{ color: T.textDim }}>{"\u2014"}</span>
        )}
      </td>
    </tr>
  );
}
