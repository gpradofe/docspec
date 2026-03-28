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
    <div className="fixed right-8 top-24 w-56 hidden xl:block">
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
        On this page
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block text-sm text-text-tertiary hover:text-text-primary transition-colors"
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
