import type { DocSpec } from "../types/docspec.js";

export interface ResolvedArtifact {
  label: string;
  color?: string;
  source: "local" | "maven" | "npm" | "crates";
  path?: string;
  spec: DocSpec;
}
