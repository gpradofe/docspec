/**
 * Guide page generator (Markdoc).
 *
 * Reads a Markdoc / Markdown file path and produces a GeneratedPage with
 * the raw content and parsed frontmatter. Actual Markdoc rendering is
 * performed at build-time by the site framework; this generator only
 * extracts the content and metadata.
 */

import { readFile } from "node:fs/promises";
import type { GeneratedPage, GuidePageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { guidePageSlug } from "../slug.js";

/** Simple frontmatter parser for --- delimited YAML blocks. */
function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = raw.match(fmRegex);

  if (!match) {
    return { frontmatter: {}, content: raw };
  }

  const fmBlock = match[1];
  const content = match[2];

  // Minimal YAML key: value parser (single-level only).
  // A full YAML parser can be swapped in when needed.
  const frontmatter: Record<string, unknown> = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (!key) continue;
    frontmatter[key] = val;
  }

  return { frontmatter, content };
}

export interface GuidePageInput {
  /** Filesystem path to the Markdoc / Markdown file. */
  filePath: string;
  /** Relative path used for slug generation (e.g. "getting-started.md"). */
  relativePath: string;
}

export async function generateGuidePage(input: GuidePageInput): Promise<GeneratedPage> {
  const { filePath, relativePath } = input;

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    raw = "";
  }

  const { frontmatter, content } = parseFrontmatter(raw);

  const title =
    typeof frontmatter.title === "string"
      ? frontmatter.title
      : relativePath.replace(/\.(md|mdoc|markdoc)$/i, "");

  const data: GuidePageData = {
    type: PageType.GUIDE,
    content,
    frontmatter,
  };

  return {
    type: PageType.GUIDE,
    slug: guidePageSlug(relativePath),
    title,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : undefined,
    data,
  };
}
