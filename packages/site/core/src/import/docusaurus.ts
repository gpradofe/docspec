/**
 * Import Docusaurus documentation into DocSpec format.
 *
 * Parses a Docusaurus docs directory — reading sidebars configuration for
 * navigation structure and converting markdown/MDX files into DocSpec guide
 * pages.  Front matter (title, description, sidebar_label) is extracted and
 * mapped to page metadata.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DocusaurusImportOptions {
  /** Root directory that contains the `docs/` folder (and optionally sidebars). */
  docsDir: string;
}

export interface ImportResult {
  docspec: "3.0.0";
  artifact: {
    groupId: string;
    artifactId: string;
    version: string;
    language: string;
  };
  modules: ImportedModule[];
  guides?: ImportedGuide[];
}

interface ImportedModule {
  id: string;
  name: string;
  description?: string;
  members?: ImportedMember[];
}

interface ImportedMember {
  kind: string;
  name: string;
  qualified: string;
  description?: string;
}

interface ImportedGuide {
  slug: string;
  title: string;
  description?: string;
  content: string;
  frontmatter: Record<string, unknown>;
  order?: number;
}

interface SidebarItem {
  type: "category" | "doc" | "link";
  label?: string;
  id?: string;
  items?: (SidebarItem | string)[];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Import documentation from a Docusaurus project into DocSpec format.
 *
 * 1. Detects the docs directory (either `docsDir` itself or `docsDir/docs`).
 * 2. Attempts to load `sidebars.js`, `sidebars.ts`, or `sidebars.json` for
 *    navigation ordering.
 * 3. Reads every `.md` and `.mdx` file, parses YAML front matter, and strips
 *    JSX from MDX content.
 * 4. Returns an `ImportResult` containing the artifact, an auto-generated
 *    module, and an array of guide pages.
 */
export async function importFromDocusaurus(
  docsDir: string,
): Promise<ImportResult> {
  // Resolve the actual docs directory ---
  const resolvedDocsDir = await resolveDocsDir(docsDir);

  // Try to load sidebar configuration ---
  const sidebarOrder = await loadSidebarOrder(docsDir);

  // Discover all markdown / MDX files ---
  const mdFiles = await discoverMarkdownFiles(resolvedDocsDir);

  if (mdFiles.length === 0) {
    return emptyResult(docsDir);
  }

  // Parse each file ---
  const guides: ImportedGuide[] = [];

  for (const filePath of mdFiles) {
    const raw = await fs.readFile(filePath, "utf-8");
    const { frontmatter, body } = parseFrontMatter(raw);

    const relativePath = path.relative(resolvedDocsDir, filePath);
    const slug = filePathToSlug(relativePath);
    const title =
      asString(frontmatter.title) ??
      asString(frontmatter.sidebar_label) ??
      slugToTitle(slug);
    const description = asString(frontmatter.description);

    // Strip JSX from MDX files so the content is plain markdown.
    const cleanBody = filePath.endsWith(".mdx") ? stripJsx(body) : body;

    const order = sidebarOrder.get(slug);

    guides.push({
      slug,
      title,
      description,
      content: cleanBody.trim(),
      frontmatter,
      order,
    });
  }

  // Sort guides by sidebar order (if known), then alphabetically.
  guides.sort((a, b) => {
    const oa = a.order ?? Number.MAX_SAFE_INTEGER;
    const ob = b.order ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return a.slug.localeCompare(b.slug);
  });

  // Build a single module containing all guide "members" ---
  const members: ImportedMember[] = guides.map((g) => ({
    kind: "class",
    name: g.title,
    qualified: `docs.${g.slug.replace(/\//g, ".")}`,
    description: g.description ?? g.content.slice(0, 200),
  }));

  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "imported",
      artifactId: extractProjectName(docsDir),
      version: "0.0.0",
      language: "docusaurus",
    },
    modules: [
      {
        id: "docs",
        name: "Documentation",
        description: `Imported from Docusaurus (${guides.length} pages)`,
        members,
      },
    ],
    guides,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Resolve the docs directory — accepts both the project root and the docs/ subdirectory. */
async function resolveDocsDir(input: string): Promise<string> {
  const candidate = path.join(input, "docs");
  try {
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) return candidate;
  } catch {
    // fall through
  }
  // Assume the caller already pointed at the docs folder itself.
  return input;
}

/** Attempt to load sidebar ordering from common Docusaurus sidebar files. */
async function loadSidebarOrder(
  projectDir: string,
): Promise<Map<string, number>> {
  const order = new Map<string, number>();

  // Try JSON-based sidebars first — the safest to parse without `require`.
  for (const filename of ["sidebars.json", "sidebars.js", "sidebars.ts"]) {
    const filePath = path.join(projectDir, filename);
    try {
      await fs.access(filePath);
    } catch {
      continue;
    }

    try {
      const raw = await fs.readFile(filePath, "utf-8");

      if (filename.endsWith(".json")) {
        const parsed = JSON.parse(raw);
        flattenSidebar(parsed, order);
        return order;
      }

      // For JS/TS files we do a best-effort extraction of string doc IDs.
      // Full evaluation would require a JS runtime which we avoid.
      const docIds = extractDocIdsFromSource(raw);
      for (let i = 0; i < docIds.length; i++) {
        order.set(docIds[i], i);
      }
      return order;
    } catch {
      // Malformed file — skip.
    }
  }

  return order;
}

/** Recursively flatten a sidebars object into an ordered map of doc id -> index. */
function flattenSidebar(
  obj: unknown,
  order: Map<string, number>,
): void {
  if (typeof obj === "string") {
    order.set(obj, order.size);
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      flattenSidebar(item, order);
    }
    return;
  }
  if (typeof obj === "object" && obj !== null) {
    const record = obj as Record<string, unknown>;
    // Handle { type: "doc", id: "..." }
    if (record.type === "doc" && typeof record.id === "string") {
      order.set(record.id, order.size);
      return;
    }
    // Handle { type: "category", items: [...] }
    if (record.items) {
      flattenSidebar(record.items, order);
    }
    // Handle { SidebarLabel: [...] } shorthand
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        flattenSidebar(value, order);
      }
    }
  }
}

/** Best-effort extraction of quoted doc IDs from a JS/TS sidebar source file. */
function extractDocIdsFromSource(source: string): string[] {
  const ids: string[] = [];
  // Match both single and double quoted strings that look like doc IDs
  // (alphanumeric, hyphens, slashes).
  const regex = /['"]([a-zA-Z0-9][a-zA-Z0-9\-_/]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    const id = match[1];
    // Ignore common non-doc-id strings.
    if (
      id === "category" ||
      id === "doc" ||
      id === "link" ||
      id === "autogenerated" ||
      id.startsWith("http")
    ) {
      continue;
    }
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/** Recursively discover all .md and .mdx files under a directory. */
async function discoverMarkdownFiles(dir: string): Promise<string[]> {
  const result: string[] = [];

  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await discoverMarkdownFiles(full);
      result.push(...nested);
    } else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      result.push(full);
    }
  }

  return result;
}

/** Parse YAML front matter delimited by `---`. */
function parseFrontMatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = fmRegex.exec(raw);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }

  const yamlBlock = match[1];
  const body = match[2];

  // Lightweight YAML parser — handles simple key: value pairs only.
  const frontmatter: Record<string, unknown> = {};
  for (const line of yamlBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx < 1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value: string | boolean | number = trimmed.slice(colonIdx + 1).trim();

    // Strip surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Coerce booleans and numbers.
    if (value === "true") {
      frontmatter[key] = true;
    } else if (value === "false") {
      frontmatter[key] = false;
    } else if (value !== "" && !isNaN(Number(value))) {
      frontmatter[key] = Number(value);
    } else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/** Strip JSX / TSX elements from MDX content, keeping plain markdown intact. */
function stripJsx(content: string): string {
  // Remove import statements.
  let result = content.replace(/^import\s+.*$/gm, "");

  // Remove export default / export statements wrapping components.
  result = result.replace(/^export\s+(default\s+)?.*$/gm, "");

  // Remove self-closing JSX tags: <Component prop="value" />
  result = result.replace(/<[A-Z][A-Za-z0-9]*\b[^>]*\/>/g, "");

  // Remove opening and closing JSX tags with their content when they span
  // a single line: <Component>...</Component>
  result = result.replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*>.*?<\/\1>/g, "");

  // Remove remaining opening/closing JSX tags (multi-line — just the tags, not content).
  result = result.replace(/<\/?[A-Z][A-Za-z0-9]*\b[^>]*>/g, "");

  // Remove JSX expression blocks: {someExpression}
  result = result.replace(/\{[^{}]*\}/g, "");

  // Collapse multiple blank lines.
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

/** Convert a file path like `guides/getting-started.mdx` to `guides/getting-started`. */
function filePathToSlug(relativePath: string): string {
  return relativePath
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "");
}

/** Convert a slug to a human-readable title. */
function slugToTitle(slug: string): string {
  const last = slug.split("/").pop() ?? slug;
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract the project name from the directory path. */
function extractProjectName(dir: string): string {
  return path.basename(path.resolve(dir));
}

/** Safe cast to string. */
function asString(val: unknown): string | undefined {
  return typeof val === "string" && val.length > 0 ? val : undefined;
}

/** Return an empty result when no docs are found. */
function emptyResult(dir: string): ImportResult {
  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "imported",
      artifactId: extractProjectName(dir),
      version: "0.0.0",
      language: "docusaurus",
    },
    modules: [],
  };
}
