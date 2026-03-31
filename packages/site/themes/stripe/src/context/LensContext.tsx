"use client";

import React, { createContext, useContext, type ReactNode } from "react";

export type Lens = "docs" | "tests";

interface LensContextType {
  lens: Lens;
  setLens: (lens: Lens) => void;
  selectedArtifacts: Set<string>;
}

const LensContext = createContext<LensContextType>({
  lens: "docs",
  setLens: () => {},
  selectedArtifacts: new Set(),
});

export function LensProvider({
  lens,
  setLens,
  selectedArtifacts,
  children,
}: LensContextType & { children: ReactNode }) {
  return (
    <LensContext.Provider value={{ lens, setLens, selectedArtifacts }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens(): LensContextType {
  return useContext(LensContext);
}
