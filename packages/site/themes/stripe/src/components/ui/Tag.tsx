import React from "react";
import { T } from "../../lib/tokens.js";

interface TagProps {
  children: React.ReactNode;
  color?: string;
}

export function Tag({ children, color = T.accent }: TagProps) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: color + "14",
        color,
        border: `1px solid ${color}30`,
        fontFamily: T.mono,
        letterSpacing: "0.02em",
        lineHeight: "16px",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}
