"use client";

import React from "react";

interface TocItem {
  id: string;
  label: string;
  depth: number;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <div className="my-8 py-4 border-y border-border">
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
        Contents
      </h4>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block text-sm text-text-secondary hover:text-primary-500 transition-colors"
              style={{ paddingLeft: `${(item.depth - 1) * 12}px` }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
