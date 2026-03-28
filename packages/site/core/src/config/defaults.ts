import type { BuildConfig } from "../types/config.js";

export const DEFAULT_BUILD_CONFIG: Required<BuildConfig> = {
  outputDir: "./out",
  cacheDir: "./.docspec-cache",
  search: true,
  codeLanguages: ["java", "typescript", "python", "curl"],
  versioning: false,
  audiences: ["public"],
};

export const DEFAULT_THEME = "@docspec/theme-stripe";
