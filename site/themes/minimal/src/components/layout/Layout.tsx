"use client";

import React from "react";
import type { NavigationTree } from "@docspec/core";
import { Header } from "./Header.js";

interface LayoutProps {
  children: React.ReactNode;
  navigation: NavigationTree;
  siteName: string;
  logo?: string;
  currentSlug?: string;
  referenceIndex?: Record<string, string>;
}

export function Layout({
  children,
  navigation,
  siteName,
  logo,
  currentSlug,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      <Header siteName={siteName} logo={logo} navigation={navigation} currentSlug={currentSlug} />
      <main className="max-w-[720px] mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
