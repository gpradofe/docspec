import React from "react";
import type { EventCatalogPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface EventCatalogPageProps {
  data: EventCatalogPageData;
}

export function EventCatalogPage({ data }: EventCatalogPageProps) {
  const { events, artifact } = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: "Event Catalog" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Event Catalog</h1>
      <p className="text-text-secondary mb-6">All documented events from {artifact.label}</p>

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.name} className="p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-sm font-bold text-text-primary">{event.name}</h3>
              {event.deliveryGuarantee && <Badge variant="info">{event.deliveryGuarantee}</Badge>}
            </div>
            {event.description && <p className="text-sm text-text-secondary mb-3">{event.description}</p>}
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              {event.trigger && (
                <div><span className="text-text-tertiary">Trigger: </span><span className="text-text-secondary">{event.trigger}</span></div>
              )}
              {event.channel && (
                <div><span className="text-text-tertiary">Channel: </span><code className="font-mono text-text-secondary">{event.channel}</code></div>
              )}
              {event.retryPolicy && (
                <div><span className="text-text-tertiary">Retry: </span><span className="text-text-secondary">{event.retryPolicy}</span></div>
              )}
              {event.since && (
                <div><span className="text-text-tertiary">Since: </span><span className="text-text-secondary">{event.since}</span></div>
              )}
            </div>
            {event.payload && event.payload.fields && event.payload.fields.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-tertiary uppercase mb-2">
                  Payload &mdash; {event.payload.type || "unknown"}
                </h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 pr-3 text-text-tertiary font-medium text-xs">Field</th>
                      <th className="text-left py-1 pr-3 text-text-tertiary font-medium text-xs">Type</th>
                      <th className="text-left py-1 text-text-tertiary font-medium text-xs">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.payload.fields.map((f) => (
                      <tr key={f.name} className="border-b border-border/50">
                        <td className="py-1 pr-3 font-mono">{f.name}</td>
                        <td className="py-1 pr-3 font-mono text-primary-500">{f.type}</td>
                        <td className="py-1 text-text-secondary">{f.description || "\u2014"}</td>
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
