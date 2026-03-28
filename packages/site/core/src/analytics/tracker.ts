/**
 * Analytics tracker — collects page view and interaction events.
 */

export interface AnalyticsEvent {
  type: "page_view" | "search" | "click" | "feedback" | "navigation";
  timestamp: string;
  page?: string;
  pageType?: string;
  query?: string;
  target?: string;
  metadata?: Record<string, string>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  anonymize?: boolean;
}

export class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private config: AnalyticsConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      endpoint: config.endpoint,
      batchSize: config.batchSize ?? 50,
      flushIntervalMs: config.flushIntervalMs ?? 30_000,
      anonymize: config.anonymize ?? true,
    };

    if (this.config.enabled && (this.config.flushIntervalMs ?? 0) > 0) {
      this.flushTimer = setInterval(
        () => void this.flush(),
        this.config.flushIntervalMs,
      );
    }
  }

  track(event: Omit<AnalyticsEvent, "timestamp">): void {
    if (!this.config.enabled) return;

    this.events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });

    if (this.events.length >= (this.config.batchSize ?? 50)) {
      void this.flush();
    }
  }

  trackPageView(page: string, pageType?: string): void {
    this.track({ type: "page_view", page, pageType });
  }

  trackSearch(query: string, page?: string): void {
    this.track({ type: "search", query, page });
  }

  trackClick(target: string, page?: string): void {
    this.track({ type: "click", target, page });
  }

  trackNavigation(from: string, to: string): void {
    this.track({
      type: "navigation",
      metadata: { from, to },
    });
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const batch = this.events.splice(0);

    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events: batch }),
        });
      } catch {
        // Re-queue on failure
        this.events.unshift(...batch);
      }
    }
  }

  getEvents(): readonly AnalyticsEvent[] {
    return this.events;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
