import React from "react";
import { CH } from "../../lib/tokens.js";

interface ChTagProps {
  ch: string;
}

export function ChTag({ ch }: ChTagProps) {
  const c = CH[ch];
  if (!c) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: c.c + "14",
        color: c.c,
        border: `1px solid ${c.c}30`,
      }}
    >
      {c.l}
    </span>
  );
}
