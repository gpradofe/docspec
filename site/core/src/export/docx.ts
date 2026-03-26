/**
 * DOCX export — generates a DOCX document from generated pages.
 * Produces an Open XML directory structure.
 */

import type { GeneratedPage } from "../types/page.js";

export interface DocxExportOptions {
  outputPath: string;
  title?: string;
  author?: string;
  includePageTypes?: string[];
  excludePageTypes?: string[];
}

export interface DocxExportResult {
  outputPath: string;
  pageCount: number;
  sizeBytes: number;
}

/**
 * Export generated pages to DOCX format.
 * Creates an Open XML document structure that can be zipped into .docx.
 */
export async function exportToDocx(
  pages: GeneratedPage[],
  options: DocxExportOptions,
): Promise<DocxExportResult> {
  const filtered = filterPages(pages, options);
  const title = options.title ?? "DocSpec Documentation";
  const author = options.author ?? "DocSpec";

  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const outDir = options.outputPath.replace(/\.docx$/, "-docx");
  await mkdir(join(outDir, "_rels"), { recursive: true });
  await mkdir(join(outDir, "word"), { recursive: true });

  // [Content_Types].xml
  await writeFile(
    join(outDir, "[Content_Types].xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    "utf-8",
  );

  // _rels/.rels
  await writeFile(
    join(outDir, "_rels", ".rels"),
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    "utf-8",
  );

  // word/document.xml
  const paragraphs = filtered
    .map((page) => {
      const lines: string[] = [];
      lines.push(`      <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(page.title)}</w:t></w:r></w:p>`);
      if (page.description) {
        lines.push(`      <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>${escapeXml(page.description)}</w:t></w:r></w:p>`);
      }
      lines.push(`      <w:p><w:r><w:rPr><w:rFonts w:ascii="Courier New"/></w:rPr><w:t xml:space="preserve">${escapeXml(JSON.stringify(page.data, null, 2))}</w:t></w:r></w:p>`);
      return lines.join("\n");
    })
    .join("\n");

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>
${paragraphs}
  </w:body>
</w:document>`;

  await writeFile(join(outDir, "word", "document.xml"), docXml, "utf-8");

  return {
    outputPath: outDir,
    pageCount: filtered.length,
    sizeBytes: Buffer.byteLength(docXml, "utf-8"),
  };
}

function filterPages(
  pages: GeneratedPage[],
  options: DocxExportOptions,
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
    .replace(/"/g, "&quot;");
}
