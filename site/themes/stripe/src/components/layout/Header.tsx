"use client";

import React from "react";

interface HeaderProps {
  siteName: string;
  logo?: string;
  onToggleSidebar: () => void;
  activeTab?: "docs" | "tests";
}

export function Header({ siteName, logo, onToggleSidebar, activeTab = "docs" }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-primary-800 border-b border-primary-900 z-50 flex items-center px-4">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-md hover:bg-primary-700 text-white mr-3"
        aria-label="Toggle sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {logo && <img src={logo} alt="" className="h-6 mr-2" />}

      <span className="font-semibold text-white text-sm">
        {siteName}
      </span>

      <div className="flex items-center gap-1 ml-6">
        <a
          href="/"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "docs"
              ? "bg-primary-700 text-white"
              : "text-primary-300 hover:text-white hover:bg-primary-700/50"
          }`}
        >
          Docs
        </a>
        <a
          href="/tests"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "tests"
              ? "bg-primary-700 text-white"
              : "text-primary-300 hover:text-white hover:bg-primary-700/50"
          }`}
        >
          Tests
        </a>
      </div>

      <div className="flex-1" />

      <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary-600 text-primary-200 text-xs hover:border-primary-400 hover:text-white transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Search
        <kbd className="ml-2 px-1.5 py-0.5 rounded border border-primary-600 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}
