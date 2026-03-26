import React from "react";
import { Breadcrumb } from "../layout/Breadcrumb.js";

export function ChangelogPage() {
  return (
    <div>
      <Breadcrumb items={[{ label: "Changelog" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Changelog</h1>
      <p className="text-text-secondary mb-6">
        Version history and documentation diffs
      </p>

      <div className="text-center py-12 text-text-tertiary">
        <p className="text-lg mb-2">Coming in Phase 4</p>
        <p className="text-sm">
          Version diffing will automatically detect added, modified, removed, and deprecated members
          between artifact versions.
        </p>
      </div>
    </div>
  );
}
