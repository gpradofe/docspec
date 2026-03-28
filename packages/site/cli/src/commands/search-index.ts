import * as fs from "node:fs";
import * as path from "node:path";

export interface SearchIndexOptions {
  inputDir?: string;
  outputPath?: string;
}

export interface SearchIndexEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  slug: string;
  tags?: string[];
}

export async function buildSearchIndex(options: SearchIndexOptions): Promise<void> {
  const inputDir = options.inputDir ?? ".docspec";
  const outputPath = options.outputPath ?? "out/search-index.json";

  console.log("DocSpec: Building search index...");

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const entries: SearchIndexEntry[] = [];

  // Scan for generated page JSON files
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith(".json"));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(inputDir, file), "utf-8");
      const page = JSON.parse(content);

      if (page.title && page.slug) {
        entries.push({
          id: page.slug,
          title: page.title,
          content: extractTextContent(page),
          type: page.type ?? "unknown",
          slug: page.slug,
          tags: page.tags,
        });
      }
    } catch {
      // Skip unparseable files
    }
  }

  // Write search index
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2), "utf-8");
  console.log(`DocSpec: Search index written with ${entries.length} entries to ${outputPath}`);
}

function extractTextContent(page: any): string {
  const parts: string[] = [];
  if (page.description) parts.push(page.description);

  // Extract text from common data structures
  const data = page.data;
  if (data?.member?.description) parts.push(data.member.description);
  if (data?.module?.description) parts.push(data.module.description);
  if (data?.flow?.description) parts.push(data.flow.description);

  return parts.join(" ").slice(0, 500);
}
