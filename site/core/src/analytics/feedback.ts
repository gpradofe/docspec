/**
 * Feedback collector — per-page thumbs up/down + comments.
 */

export interface FeedbackEntry {
  pageId: string;
  pageType: string;
  rating: "positive" | "negative";
  comment?: string;
  timestamp: string;
  sessionId?: string;
}

export interface FeedbackConfig {
  enabled: boolean;
  storageKey?: string;
  endpoint?: string;
}

export class FeedbackCollector {
  private entries: FeedbackEntry[] = [];
  private config: FeedbackConfig;

  constructor(config: Partial<FeedbackConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      storageKey: config.storageKey ?? "docspec-feedback",
      endpoint: config.endpoint,
    };
  }

  submit(entry: Omit<FeedbackEntry, "timestamp">): void {
    if (!this.config.enabled) return;

    const full: FeedbackEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.entries.push(full);

    if (this.config.endpoint) {
      void this.send(full);
    }
  }

  private async send(entry: FeedbackEntry): Promise<void> {
    try {
      await fetch(this.config.endpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch {
      // Silently fail — feedback is non-critical
    }
  }

  getEntries(): readonly FeedbackEntry[] {
    return this.entries;
  }

  getPageRatings(pageId: string): { positive: number; negative: number } {
    const pageEntries = this.entries.filter((e) => e.pageId === pageId);
    return {
      positive: pageEntries.filter((e) => e.rating === "positive").length,
      negative: pageEntries.filter((e) => e.rating === "negative").length,
    };
  }
}
