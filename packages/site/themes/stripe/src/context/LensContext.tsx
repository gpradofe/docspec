"use client";

import React, { createContext, useContext, type ReactNode } from "react";

export type Lens = "docs" | "tests";

interface LensContextType {
  lens: Lens;
  setLens: (lens: Lens) => void;
}

const LensContext = createContext<LensContextType>({
  lens: "docs",
  setLens: () => {},
});

export function LensProvider({
  lens,
  setLens,
  children,
}: LensContextType & { children: ReactNode }) {
  return (
    <LensContext.Provider value={{ lens, setLens }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens(): LensContextType {
  return useContext(LensContext);
}
