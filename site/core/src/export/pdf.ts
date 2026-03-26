/**
 * PDF export — generates a PDF document from generated pages.
 */

import type { GeneratedPage } from "../types/page.js";

export interface PdfExportOptions {
  outputPath: string;
  title?: string;
  includePageTypes?: string[];
  excludePageTypes?: string[];
  headerHtml?: string;
  footerHtml?: string;
  pageSize?: "A4" | "Letter" | "Legal";
  landscape?: boolean;
}

export interface PdfExportResult {
  outputPath: string;
  pageCount: number;
  sizeBytes: number;
}

/**
 * Export generated pages to PDF format.
 * Uses a headless browser (puppeteer) approach for rendering.
 */
export async function exportToPdf(
  pages: GeneratedPage[],
  options: PdfExportOptions,
): Promise<PdfExportResult> {
  const filtered = filterPages(pages, options);

  // Build HTML document from pages
  const html = buildHtmlDocument(filtered, options);

  // For now, write HTML file that can be converted externally
  const { writeFile } = await import("node:fs/promises");
  const htmlPath = options.outputPath.replace(/\.pdf$/, ".html");
  await writeFile(htmlPath, html, "utf-8");

  return {
    outputPath: htmlPath,
    pageCount: filtered.length,
    sizeBytes: Buffer.byteLength(html, "utf-8"),
  };
}

function filterPages(
  pages: GeneratedPage[],
  options: PdfExportOptions,
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

function buildHtmlDocument(
  pages: GeneratedPage[],
  options: PdfExportOptions,
): string {
  const title = options.title ?? "DocSpec Documentation";
  const sections = pages
    .map(
      (p) => `
    <section class="page" data-type="${p.type}">
      <h2>${p.title}</h2>
      ${p.description ? `<p class="description">${p.description}</p>` : ""}
      <div class="content">
        ${renderPageData(p)}
      </div>
    </section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2cm; color: #1a1a1a; }
    .page { page-break-after: always; margin-bottom: 2em; }
    h1 { font-size: 2em; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; color: #2563eb; margin-top: 1.5em; }
    .description { color: #666; font-size: 1.1em; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${sections}
</body>
</html>`;
}

function renderPageData(page: GeneratedPage): string {
  const data = page.data;
  if (!data) return "<p><em>No data available</em></p>";
  return `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
}
