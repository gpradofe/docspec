"use client";

import React, { useState } from "react";

export function FeedbackWidget() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="mt-12 pt-6 border-t border-border text-center">
        <p className="text-sm text-text-tertiary">Thanks for the feedback!</p>
      </div>
    );
  }

  return (
    <div className="mt-12 pt-6 border-t border-border text-center">
      <p className="text-sm text-text-secondary mb-3">Was this page helpful?</p>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => setSubmitted(true)}
          className="px-4 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
        >
          Yes
        </button>
        <button
          onClick={() => setSubmitted(true)}
          className="px-4 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
        >
          No
        </button>
      </div>
    </div>
  );
}
