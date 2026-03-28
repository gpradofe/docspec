"use client";

import React, { useState } from "react";
import type { NavigationTree } from "@docspec/core";

interface HeaderProps {
  siteName: string;
  logo?: string;
  navigation?: NavigationTree;
  currentSlug?: string;
}

export function Header({ siteName, logo, navigation, currentSlug }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center">
        {logo && <img src={logo} alt="" className="h-5 mr-2" />}
        <span className="font-semibold text-text-primary text-sm">{siteName}</span>

        <div className="flex-1" />

        {/* Navigation links from top-level sections */}
        {navigation && (
          <nav className="hidden md:flex items-center gap-4">
            {navigation.sections.map((section) => (
              <a
                key={section.title}
                href={section.items[0]?.slug ? (section.items[0].slug.startsWith("/") ? section.items[0].slug : `/${section.items[0].slug}`) : "#"}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {section.title}
              </a>
            ))}
          </nav>
        )}

        {/* Mobile menu button */}
        {navigation && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-surface-secondary text-text-secondary"
            aria-label="Toggle menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Mobile dropdown nav */}
      {menuOpen && navigation && (
        <nav className="md:hidden border-t border-border bg-surface px-6 py-3">
          {navigation.sections.map((section) => (
            <div key={section.title} className="mb-3">
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">{section.title}</div>
              {section.items.map((item) => (
                <a
                  key={item.slug || item.label}
                  href={item.slug ? (item.slug.startsWith("/") ? item.slug : `/${item.slug}`) : "#"}
                  className={`block py-1 text-sm ${currentSlug === item.slug || currentSlug === item.slug?.replace(/^\//, "") ? "text-primary-500 font-medium" : "text-text-secondary hover:text-text-primary"}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
