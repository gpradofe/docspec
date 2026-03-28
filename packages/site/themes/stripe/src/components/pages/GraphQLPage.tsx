import React from "react";

export interface GraphQLPageProps {
  data: {
    queries: any[];
    mutations: any[];
    subscriptions: any[];
    types: any[];
    artifact: { label: string; color?: string };
  };
}

export function GraphQLPage({ data }: GraphQLPageProps) {
  const { queries, mutations, subscriptions, types, artifact } = data;

  return (
    <div className="docspec-graphql-page">
      <header className="page-header">
        <span className="artifact-badge" style={{ backgroundColor: artifact.color }}>
          {artifact.label}
        </span>
        <h1>GraphQL API</h1>
        <p className="page-description">
          {queries.length} queries, {mutations.length} mutations, {subscriptions.length} subscriptions, {types.length} types
        </p>
      </header>

      {queries.length > 0 && (
        <section className="graphql-section">
          <h2>Queries</h2>
          <div className="operation-list">
            {queries.map((q: any, i: number) => (
              <div key={i} className="operation-card">
                <h3>{q.name}</h3>
                {q.description && <p>{q.description}</p>}
                {q.returnType && <code className="return-type">{q.returnType}</code>}
              </div>
            ))}
          </div>
        </section>
      )}

      {mutations.length > 0 && (
        <section className="graphql-section">
          <h2>Mutations</h2>
          <div className="operation-list">
            {mutations.map((m: any, i: number) => (
              <div key={i} className="operation-card">
                <h3>{m.name}</h3>
                {m.description && <p>{m.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {subscriptions.length > 0 && (
        <section className="graphql-section">
          <h2>Subscriptions</h2>
          <div className="operation-list">
            {subscriptions.map((s: any, i: number) => (
              <div key={i} className="operation-card">
                <h3>{s.name}</h3>
                {s.description && <p>{s.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {types.length > 0 && (
        <section className="graphql-section">
          <h2>Types</h2>
          <div className="type-list">
            {types.map((t: any, i: number) => (
              <div key={i} className="type-card">
                <h3><span className="type-kind">{t.kind}</span> {t.name}</h3>
                {t.fields && (
                  <ul className="field-list">
                    {t.fields.map((f: any, j: number) => (
                      <li key={j}><code>{f.name}: {f.type}</code></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
