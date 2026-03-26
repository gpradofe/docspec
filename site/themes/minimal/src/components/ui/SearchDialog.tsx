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
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  if (!open) return null;

  const lowerQuery = query.toLowerCase();
  const results = query.length > 0
    ? pages.filter((p) => p.title.toLowerCase().includes(lowerQuery) || (p.description && p.description.toLowerCase().includes(lowerQuery))).slice(0, 20)
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-surface rounded-xl shadow-xl border border-border overflow-hidden">
        <div className="flex items-center px-4 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1 px-2 py-3 text-sm bg-transparent outline-none text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((result) => (
              <li key={result.slug}>
                <a href={`/${result.slug}`} className="block px-4 py-2 hover:bg-surface-secondary text-sm text-text-primary" onClick={() => setOpen(false)}>
                  {result.title}
                  {result.description && <span className="block text-xs text-text-tertiary mt-0.5">{result.description}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
        {query.length > 0 && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">No results for &quot;{query}&quot;</div>
        )}
      </div>
    </div>
  );
}
