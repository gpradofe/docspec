import React from "react";

interface VersionSelectorProps {
  versions: string[];
  current: string;
  onChange?: (version: string) => void;
}

export function VersionSelector({ versions, current, onChange }: VersionSelectorProps) {
  return (
    <select
      value={current}
      onChange={(e) => onChange?.(e.target.value)}
      className="text-xs px-2 py-1 rounded border border-border bg-surface-secondary text-text-secondary cursor-pointer"
    >
      {versions.map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );
}
