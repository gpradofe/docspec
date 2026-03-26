/**
 * Import Confluence HTML/XML exports into DocSpec format.
 *
 * Supports two Confluence export formats:
 *   1. **HTML export** — a directory containing `.html` files with
 *      `<title>` tags and inter-page links.
 *   2. **Confluence Storage Format (XML)** — `entities.xml` produced by
 *      Confluence space XML exports.
 *
 * The importer extracts page titles, content, labels (tags), and the
 * parent-child page hierarchy, converting them into DocSpec guide pages
 * and auto-generated modules.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ConfluenceImportOptions {
  /** Directory containing the Confluence export files. */
  exportDir: string;
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
  tags?: string[];
}

interface ImportedGuide {
  slug: string;
  title: string;
  description?: string;
  content: string;
  frontmatter: Record<string, unknown>;
  parent?: string;
  labels?: string[];
}

/** Internal representation of a parsed Confluence page. */
interface ConfluencePage {
  id: string;
  title: string;
  body: string;
  labels: string[];
  parentId?: string;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Import documentation from a Confluence export directory into DocSpec format.
 *
 * Detection logic:
 *   - If `entities.xml` exists, use the XML storage format parser.
 *   - Otherwise, scan for `.html` files and parse them individually.
 */
export async function importFromConfluence(
  exportDir: string,
): Promise<ImportResult> {
  const resolvedDir = path.resolve(exportDir);

  let pages: ConfluencePage[];

  // Detect export format ---
  const entitiesPath = path.join(resolvedDir, "entities.xml");
  let hasEntitiesXml = false;
  try {
    await fs.access(entitiesPath);
    hasEntitiesXml = true;
  } catch {
    // Not an XML export.
  }

  if (hasEntitiesXml) {
    pages = await parseXmlExport(entitiesPath);
  } else {
    pages = await parseHtmlExport(resolvedDir);
  }

  if (pages.length === 0) {
    return emptyResult(resolvedDir);
  }

  // Build parent-child lookup ---
  const parentLookup = new Map<string, string>();
  for (const page of pages) {
    if (page.parentId) {
      parentLookup.set(page.id, page.parentId);
    }
  }
  const idToTitle = new Map(pages.map((p) => [p.id, p.title]));

  // Convert pages to guides ---
  const guides: ImportedGuide[] = [];
  const allLabels = new Set<string>();

  for (const page of pages) {
    const slug = titleToSlug(page.title);
    const markdown = htmlToMarkdown(page.body);
    const description = markdown.slice(0, 200).split("\n")[0] || undefined;
    const parentTitle = page.parentId
      ? idToTitle.get(page.parentId)
      : undefined;

    for (const label of page.labels) {
      allLabels.add(label);
    }

    const frontmatter: Record<string, unknown> = {
      title: page.title,
      confluenceId: page.id,
    };
    if (page.labels.length > 0) {
      frontmatter.labels = page.labels;
    }
    if (parentTitle) {
      frontmatter.parent = parentTitle;
    }

    guides.push({
      slug,
      title: page.title,
      description,
      content: markdown.trim(),
      frontmatter,
      parent: parentTitle,
      labels: page.labels.length > 0 ? page.labels : undefined,
    });
  }

  // Build members from pages (one per page) ---
  const members: ImportedMember[] = guides.map((g) => ({
    kind: "class" as const,
    name: g.title,
    qualified: `confluence.${g.slug.replace(/\//g, ".")}`,
    description: g.description,
    tags: g.labels,
  }));

  // Group pages by top-level parent into modules ---
  const modules = buildModuleHierarchy(pages, guides, members);

  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "imported",
      artifactId: extractProjectName(resolvedDir),
      version: "0.0.0",
      language: "confluence",
    },
    modules,
    guides,
  };
}

// ---------------------------------------------------------------------------
// XML export parser (Confluence Storage Format)
// ---------------------------------------------------------------------------

async function parseXmlExport(entitiesPath: string): Promise<ConfluencePage[]> {
  const raw = await fs.readFile(entitiesPath, "utf-8");
  const pages: ConfluencePage[] = [];

  // Extract <object class="Page"> blocks.
  const pageRegex =
    /<object\s+class="Page"[^>]*>([\s\S]*?)<\/object>/gi;
  let pageMatch: RegExpExecArray | null;

  while ((pageMatch = pageRegex.exec(raw)) !== null) {
    const block = pageMatch[1];

    const id = extractProperty(block, "id") ?? `page-${pages.length}`;
    const title = extractProperty(block, "title") ?? "Untitled";
    const bodyContent = extractProperty(block, "bodyContents") ?? extractCdata(block) ?? "";
    const parentId = extractProperty(block, "parent") ?? extractIdRef(block, "parent");

    // Extract labels from <collection name="labellings"> blocks.
    const labels = extractLabels(block);

    pages.push({ id, title, body: bodyContent, labels, parentId });
  }

  // Fallback: if no <object class="Page"> blocks were found, try a simpler
  // structure sometimes used by Confluence Data Center exports.
  if (pages.length === 0) {
    const altPageRegex = /<page[^>]*>([\s\S]*?)<\/page>/gi;
    let altMatch: RegExpExecArray | null;
    while ((altMatch = altPageRegex.exec(raw)) !== null) {
      const block = altMatch[1];
      const id = extractTagContent(block, "id") ?? `page-${pages.length}`;
      const title = extractTagContent(block, "title") ?? "Untitled";
      const body = extractTagContent(block, "body") ?? extractTagContent(block, "content") ?? "";
      const parentId = extractTagContent(block, "parentId") ?? undefined;
      const labelStr = extractTagContent(block, "labels") ?? "";
      const labels = labelStr
        .split(/[,;]/)
        .map((l) => l.trim())
        .filter(Boolean);

      pages.push({ id, title, body, labels, parentId });
    }
  }

  return pages;
}

// ---------------------------------------------------------------------------
// HTML export parser
// ---------------------------------------------------------------------------

async function parseHtmlExport(dir: string): Promise<ConfluencePage[]> {
  const pages: ConfluencePage[] = [];
  const htmlFiles = await discoverHtmlFiles(dir);

  for (const filePath of htmlFiles) {
    const raw = await fs.readFile(filePath, "utf-8");

    // Title: from <title> tag.
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw);
    const title = titleMatch
      ? decodeHtmlEntities(titleMatch[1].trim())
      : path.basename(filePath, ".html");

    // Body: prefer <div id="main-content"> or <div class="wiki-content">,
    // otherwise fall back to <body>.
    let body = "";
    const mainContentMatch =
      /<div[^>]*(?:id="main-content"|class="[^"]*wiki-content[^"]*")[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div)/i.exec(
        raw,
      );
    if (mainContentMatch) {
      body = mainContentMatch[1];
    } else {
      const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(raw);
      body = bodyMatch ? bodyMatch[1] : raw;
    }

    // Labels: Confluence HTML exports sometimes include labels in
    // <span class="label"> or data attributes.
    const labels = extractHtmlLabels(raw);

    // Derive a stable ID from the filename.
    const id = path.basename(filePath, ".html");

    // Parent: Confluence HTML exports sometimes encode hierarchy via
    // breadcrumbs.  We extract the immediate parent from breadcrumb links.
    const parentId = extractBreadcrumbParent(raw);

    pages.push({ id, title, body, labels, parentId });
  }

  return pages;
}

// ---------------------------------------------------------------------------
// HTML -> Markdown conversion
// ---------------------------------------------------------------------------

/** Convert HTML content to markdown.  Handles the most common elements. */
function htmlToMarkdown(html: string): string {
  let md = html;

  // Remove script and style blocks.
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Headings.
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `# ${stripTags(c).trim()}\n\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `## ${stripTags(c).trim()}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `### ${stripTags(c).trim()}\n\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => `#### ${stripTags(c).trim()}\n\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, c) => `##### ${stripTags(c).trim()}\n\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, c) => `###### ${stripTags(c).trim()}\n\n`);

  // Bold / italic.
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, c) => `**${stripTags(c)}**`);
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, c) => `*${stripTags(c)}*`);

  // Code blocks.
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, c) => `\n\`\`\`\n${decodeHtmlEntities(stripTags(c))}\n\`\`\`\n`);
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => `\n\`\`\`\n${decodeHtmlEntities(stripTags(c))}\n\`\`\`\n`);
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${stripTags(c)}\``);

  // Links.
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${stripTags(text).trim()}](${href})`);

  // Images.
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, src, alt) => `![${alt}](${src})`);
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gi, (_, src) => `![](${src})`);

  // Lists.
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${stripTags(c).trim()}\n`);
  md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");

  // Tables: convert rows to markdown tables.
  md = convertTables(md);

  // Paragraphs and line breaks.
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `${stripTags(c).trim()}\n\n`);
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) =>
    stripTags(c)
      .trim()
      .split("\n")
      .map((line: string) => `> ${line}`)
      .join("\n") + "\n\n",
  );
  md = md.replace(/<hr[^>]*\/?>/gi, "\n---\n");

  // Remove remaining HTML tags.
  md = stripTags(md);

  // Decode entities.
  md = decodeHtmlEntities(md);

  // Collapse excessive whitespace.
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}

/** Convert HTML tables to markdown tables. */
function convertTables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(stripTags(cellMatch[1]).trim());
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return "";

    const colCount = Math.max(...rows.map((r) => r.length));
    const lines: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      // Pad row to column count.
      while (rows[i].length < colCount) {
        rows[i].push("");
      }
      lines.push(`| ${rows[i].join(" | ")} |`);

      // Insert separator after header row.
      if (i === 0) {
        lines.push(`| ${rows[i].map(() => "---").join(" | ")} |`);
      }
    }

    return "\n" + lines.join("\n") + "\n";
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** Extract a property value from a Confluence XML object block. */
function extractProperty(block: string, name: string): string | undefined {
  const regex = new RegExp(
    `<property\\s+name="${name}"[^>]*>([\\s\\S]*?)<\\/property>`,
    "i",
  );
  const match = regex.exec(block);
  if (match) {
    return stripTags(match[1]).trim() || undefined;
  }

  // Also try attribute-style: <property name="..." value="..." />
  const attrRegex = new RegExp(
    `<property\\s+name="${name}"[^>]*\\svalue="([^"]*)"`,
    "i",
  );
  const attrMatch = attrRegex.exec(block);
  return attrMatch ? attrMatch[1] : undefined;
}

/** Extract content from a CDATA section. */
function extractCdata(block: string): string | undefined {
  const match = /<!\[CDATA\[([\s\S]*?)\]\]>/i.exec(block);
  return match ? match[1] : undefined;
}

/** Extract an ID reference (used for parent pointers in Confluence XML). */
function extractIdRef(block: string, propName: string): string | undefined {
  const regex = new RegExp(
    `<property\\s+name="${propName}"[^>]*>\\s*<id\\s+name="id"[^>]*>([^<]*)<\\/id>`,
    "i",
  );
  const match = regex.exec(block);
  if (match) return match[1].trim() || undefined;

  // Alternative pattern: <property name="parent"><object ...>...<id>
  const altRegex = new RegExp(
    `<property\\s+name="${propName}"[^>]*>[\\s\\S]*?<id[^>]*>([^<]+)<\\/id>`,
    "i",
  );
  const altMatch = altRegex.exec(block);
  return altMatch ? altMatch[1].trim() || undefined : undefined;
}

/** Extract labels from Confluence XML labellings collection. */
function extractLabels(block: string): string[] {
  const labels: string[] = [];
  const labelRegex =
    /<property\s+name="name"[^>]*>([^<]+)<\/property>/gi;
  // Only look within labelling blocks.
  const labellingMatch =
    /<collection\s+name="labellings"[^>]*>([\s\S]*?)<\/collection>/i.exec(block);
  if (labellingMatch) {
    let match: RegExpExecArray | null;
    while ((match = labelRegex.exec(labellingMatch[1])) !== null) {
      const label = match[1].trim();
      if (label && !labels.includes(label)) {
        labels.push(label);
      }
    }
  }
  return labels;
}

/** Extract simple tag content like `<title>Hello</title>`. */
function extractTagContent(block: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = regex.exec(block);
  return match ? match[1].trim() || undefined : undefined;
}

/** Extract labels from HTML export via <span class="label"> or similar. */
function extractHtmlLabels(html: string): string[] {
  const labels: string[] = [];
  const regex = /<span[^>]*class="[^"]*label[^"]*"[^>]*>([^<]+)<\/span>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const label = match[1].trim();
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
}

/** Extract the breadcrumb parent ID from Confluence HTML exports. */
function extractBreadcrumbParent(html: string): string | undefined {
  // Confluence HTML exports often contain breadcrumbs with links like:
  // <a href="ParentPage.html">Parent Page</a>
  const breadcrumbMatch =
    /<div[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!breadcrumbMatch) return undefined;

  const links: string[] = [];
  const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(breadcrumbMatch[1])) !== null) {
    links.push(match[1]);
  }

  // The last breadcrumb link is usually the direct parent.
  if (links.length > 0) {
    const last = links[links.length - 1];
    return last.replace(/\.html?$/i, "");
  }
  return undefined;
}

/** Recursively discover all .html files under a directory. */
async function discoverHtmlFiles(dir: string): Promise<string[]> {
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
      const nested = await discoverHtmlFiles(full);
      result.push(...nested);
    } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
      result.push(full);
    }
  }

  return result;
}

/** Convert a page title to a URL-safe slug. */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extract the project name from the directory path. */
function extractProjectName(dir: string): string {
  return path.basename(path.resolve(dir));
}

/** Build modules from page hierarchy. */
function buildModuleHierarchy(
  pages: ConfluencePage[],
  guides: ImportedGuide[],
  members: ImportedMember[],
): ImportedModule[] {
  // Find root pages (no parent).
  const rootPages = pages.filter((p) => !p.parentId);

  if (rootPages.length === 0) {
    // No hierarchy detected — return a single module.
    return [
      {
        id: "confluence",
        name: "Confluence Import",
        description: `Imported ${pages.length} pages from Confluence`,
        members,
      },
    ];
  }

  // Build child lookup.
  const childrenOf = new Map<string, ConfluencePage[]>();
  for (const page of pages) {
    if (page.parentId) {
      const children = childrenOf.get(page.parentId) ?? [];
      children.push(page);
      childrenOf.set(page.parentId, children);
    }
  }

  const slugLookup = new Map(guides.map((g) => [g.title, g]));

  const modules: ImportedModule[] = [];
  for (const root of rootPages) {
    const descendants = collectDescendants(root.id, childrenOf, pages);
    const moduleMembers: ImportedMember[] = [root, ...descendants].map(
      (p) => {
        const guide = slugLookup.get(p.title);
        return {
          kind: "class",
          name: p.title,
          qualified: `confluence.${titleToSlug(p.title)}`,
          description: guide?.description,
          tags: guide?.labels,
        };
      },
    );

    modules.push({
      id: titleToSlug(root.title),
      name: root.title,
      description: `Section with ${moduleMembers.length} page(s)`,
      members: moduleMembers,
    });
  }

  return modules;
}

/** Collect all descendant pages recursively. */
function collectDescendants(
  parentId: string,
  childrenOf: Map<string, ConfluencePage[]>,
  _allPages: ConfluencePage[],
): ConfluencePage[] {
  const children = childrenOf.get(parentId) ?? [];
  const result: ConfluencePage[] = [];
  for (const child of children) {
    result.push(child);
    result.push(...collectDescendants(child.id, childrenOf, _allPages));
  }
  return result;
}

/** Return an empty result when no pages are found. */
function emptyResult(dir: string): ImportResult {
  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "imported",
      artifactId: extractProjectName(dir),
      version: "0.0.0",
      language: "confluence",
    },
    modules: [],
  };
}
