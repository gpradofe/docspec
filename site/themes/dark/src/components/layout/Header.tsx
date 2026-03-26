"use client";

import React from "react";

interface HeaderProps {
  siteName: string;
  logo?: string;
  onToggleSidebar: () => void;
}

export function Header({ siteName, logo, onToggleSidebar }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface-secondary border-b border-border z-50 flex items-center px-4">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-md hover:bg-surface-tertiary text-text-secondary mr-3"
        aria-label="Toggle sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {logo && <img src={logo} alt="" className="h-6 mr-2" />}

      <span className="font-semibold text-text-primary text-sm">
        {siteName}
      </span>

      <div className="flex-1" />

      <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-text-secondary text-xs hover:border-border-secondary hover:text-text-primary transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Search
        <kbd className="ml-2 px-1.5 py-0.5 rounded border border-border text-[10px] font-mono text-text-tertiary">
          Ctrl+K
        </kbd>
      </button>
    </header>
  );
}
