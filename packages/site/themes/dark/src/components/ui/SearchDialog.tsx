"use client";

import React, { useState, useEffect, useRef } from "react";

interface SearchResult {
  title: string;
  description?: string;
  slug: string;
  section?: string;
}

interface SearchDialogProps {
  pages: SearchResult[];
}

export function SearchDialog({ pages }: SearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const lowerQuery = query.toLowerCase();
  const results = query.length > 0
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(lowerQuery) ||
          (p.description && p.description.toLowerCase().includes(lowerQuery))
      ).slice(0, 20)
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/70" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-surface-secondary rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center px-4 border-b border-border">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-tertiary flex-shrink-0">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="flex-1 px-3 py-3 text-sm bg-transparent outline-none text-text-primary placeholder:text-text-tertiary"
          />
          <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] text-text-tertiary font-mono">
            ESC
          </kbd>
        </div>
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((result) => (
              <li key={result.slug}>
                <a
                  href={`/${result.slug}`}
                  className="flex flex-col px-4 py-2 hover:bg-surface-tertiary transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-sm font-medium text-text-primary">
                    {result.title}
                  </span>
                  {result.description && (
                    <span className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                      {result.description}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
        {query.length > 0 && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            No results found for &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
