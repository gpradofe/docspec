import React from "react";
import type { EventCatalogPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface EventCatalogPageProps { data: EventCatalogPageData; }

export function EventCatalogPage({ data }: EventCatalogPageProps) {
  const { events, artifact } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Event Catalog</h1>
      <p className="text-text-secondary mb-6">Events from {artifact.label}</p>
      <div className="divide-y divide-border">
        {events.map((event) => (
          <div key={event.name} className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary text-sm">{event.name}</span>
              {event.deliveryGuarantee && <Badge variant="info">{event.deliveryGuarantee}</Badge>}
            </div>
            {event.description && <p className="text-sm text-text-secondary">{event.description}</p>}
            <div className="flex gap-4 text-xs text-text-tertiary mt-1">
              {event.trigger && <span>Trigger: {event.trigger}</span>}
              {event.channel && <span>Channel: {event.channel}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
