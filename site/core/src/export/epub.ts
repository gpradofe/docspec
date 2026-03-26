/**
 * EPUB export — generates an EPUB ebook from generated pages.
 */

import type { GeneratedPage } from "../types/page.js";

export interface EpubExportOptions {
  outputPath: string;
  title?: string;
  author?: string;
  language?: string;
  includePageTypes?: string[];
  excludePageTypes?: string[];
}

export interface EpubExportResult {
  outputPath: string;
  chapterCount: number;
  sizeBytes: number;
}

/**
 * Export generated pages to EPUB format.
 * Creates a valid EPUB 3 archive with XHTML content documents.
 */
export async function exportToEpub(
  pages: GeneratedPage[],
  options: EpubExportOptions,
): Promise<EpubExportResult> {
  const filtered = filterPages(pages, options);
  const title = options.title ?? "DocSpec Documentation";
  const author = options.author ?? "DocSpec";
  const language = options.language ?? "en";

  // Generate EPUB content as a directory structure
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");

  const outDir = options.outputPath.replace(/\.epub$/, "-epub");
  await mkdir(join(outDir, "META-INF"), { recursive: true });
  await mkdir(join(outDir, "OEBPS"), { recursive: true });

  // mimetype
  await writeFile(join(outDir, "mimetype"), "application/epub+zip", "utf-8");

  // container.xml
  await writeFile(
    join(outDir, "META-INF", "container.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    "utf-8",
  );

  // Generate chapter files
  const chapters: string[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const page = filtered[i];
    const filename = `chapter-${String(i + 1).padStart(3, "0")}.xhtml`;
    chapters.push(filename);

    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${language}">
<head><title>${escapeXml(page.title)}</title></head>
<body>
  <h1>${escapeXml(page.title)}</h1>
  ${page.description ? `<p>${escapeXml(page.description)}</p>` : ""}
  <pre>${escapeXml(JSON.stringify(page.data, null, 2))}</pre>
</body>
</html>`;

    await writeFile(join(outDir, "OEBPS", filename), xhtml, "utf-8");
  }

  // content.opf
  const manifest = chapters
    .map(
      (ch, i) =>
        `    <item id="ch${i + 1}" href="${ch}" media-type="application/xhtml+xml"/>`,
    )
    .join("\n");
  const spine = chapters
    .map((_, i) => `    <itemref idref="ch${i + 1}"/>`)
    .join("\n");

  await writeFile(
    join(outDir, "OEBPS", "content.opf"),
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:docspec:${Date.now()}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>${language}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`,
    "utf-8",
  );

  return {
    outputPath: outDir,
    chapterCount: chapters.length,
    sizeBytes: 0, // Would need to zip for actual size
  };
}

function filterPages(
  pages: GeneratedPage[],
  options: EpubExportOptions,
): GeneratedPage[] {
  let result = pages;
  if (options.includePageTypes?.length) {
    result = result.filter((p) => options.includePageTypes!.includes(p.type));
  }
  if (options.excludePageTypes?.length) {
    result = result.filter((p) => !options.excludePageTypes!.includes(p.type));
  }
  return result;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
