"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import FlexSearch from "flexsearch";
import type { SearchEntry } from "@docspec/core";

interface SearchDialogProps {
  entries?: SearchEntry[];
  open?: boolean;
  onClose?: () => void;
}

export function SearchDialog({ entries = [], open: controlledOpen, onClose }: SearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<any>(null);

  const open = controlledOpen !== undefined ? controlledOpen : isOpen;

  // Build FlexSearch index
  useEffect(() => {
    if (entries.length === 0) return;
    const index = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["title", "description", "content"],
        store: true,
      },
      tokenize: "forward",
      resolution: 9,
    });
    for (const entry of entries) {
      index.add(entry);
    }
    indexRef.current = index;
  }, [entries]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        onClose?.();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setSelectedIndex(0);
    if (!q.trim() || !indexRef.current) {
      setResults([]);
      return;
    }
    const raw = indexRef.current.search(q, { limit: 20, enrich: true });
    // Deduplicate results across fields
    const seen = new Set<string>();
    const merged: SearchEntry[] = [];
    for (const field of raw) {
      for (const hit of field.result) {
        const doc = hit.doc || entries.find((e: SearchEntry) => e.id === hit.id);
        if (doc && !seen.has(doc.id)) {
          seen.add(doc.id);
          merged.push(doc);
        }
      }
    }
    setResults(merged);
  }, [entries]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      window.location.href = "/" + results[selectedIndex].slug;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  if (!open) return null;

  // Group results by section
  const grouped: Record<string, SearchEntry[]> = {};
  for (const r of results) {
    if (!grouped[r.section]) grouped[r.section] = [];
    grouped[r.section].push(r);
  }

  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 100, backdropFilter: "blur(4px)",
        }}
      />

      {/* Dialog */}
      <div style={{
        position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 560, zIndex: 101,
        background: "var(--ds-surface-primary, #fff)",
        borderRadius: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
        border: "1px solid var(--ds-border, #e2e8f0)",
        overflow: "hidden",
      }}>
        {/* Search input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid var(--ds-border, #e2e8f0)",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="var(--ds-text-tertiary)" strokeWidth="1.3" />
            <path d="M11 11l3.5 3.5" stroke="var(--ds-text-tertiary)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documentation..."
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 15,
              color: "var(--ds-text-primary)", background: "transparent",
              fontFamily: "var(--font-body, 'Inter')",
            }}
          />
          <kbd style={{
            fontSize: 10, fontFamily: "var(--font-mono)",
            color: "var(--ds-text-tertiary)", background: "var(--ds-surface-tertiary)",
            border: "1px solid var(--ds-border)", borderRadius: 4, padding: "2px 6px",
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 0" }}>
          {query && results.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ds-text-tertiary)", fontSize: 14 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <div style={{
                fontSize: 10.5, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "var(--ds-text-tertiary)",
                padding: "8px 16px 4px",
              }}>
                {section}
              </div>
              {items.map((item) => {
                const idx = flatIndex++;
                const isSelected = idx === selectedIndex;
                return (
                  <a
                    key={item.id}
                    href={`/${item.slug}`}
                    style={{
                      display: "block", padding: "8px 16px",
                      background: isSelected ? "var(--ds-primary-light, #eef2ff)" : "transparent",
                      textDecoration: "none", transition: "background 0.1s ease",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text-primary)" }}>
                      {highlightMatch(item.title, query)}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: "var(--ds-text-tertiary)", marginTop: 2 }}>
                        {highlightMatch(item.description.slice(0, 120), query)}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          ))}

          {!query && (
            <div style={{ padding: "16px", textAlign: "center", color: "var(--ds-text-tertiary)", fontSize: 13 }}>
              Type to search across all documentation
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  // Use case-insensitive string comparison instead of stateful regex.test()
  const lowerQuery = query.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === lowerQuery ? (
      <mark key={i} style={{ background: "#fef08a", color: "inherit", borderRadius: 2, padding: "0 1px" }}>
        {part}
      </mark>
    ) : part
  );
}
