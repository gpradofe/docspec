import * as fs from "node:fs";

/**
 * Import TypeDoc JSON output into DocSpec format.
 */
export interface TypedocImportOptions {
  inputPath: string;
}

export async function importTypedoc(options: TypedocImportOptions): Promise<any> {
  console.log(`Importing TypeDoc from ${options.inputPath}...`);

  const content = fs.readFileSync(options.inputPath, "utf-8");
  const typedoc = JSON.parse(content);

  const modules: any[] = [];

  // Convert TypeDoc reflection to DocSpec modules
  if (typedoc.children) {
    for (const child of typedoc.children) {
      if (child.kind === 2) { // Module
        modules.push({
          id: child.name,
          name: child.name,
          members: (child.children ?? []).map((c: any) => ({
            kind: c.kind === 128 ? "class" : c.kind === 256 ? "interface" : "class",
            name: c.name,
            qualified: `${child.name}.${c.name}`,
            description: c.comment?.summary?.map((s: any) => s.text).join("") ?? undefined,
          })),
        });
      }
    }
  }

  return {
    docspec: "3.0.0",
    artifact: { groupId: "imported", artifactId: typedoc.name ?? "typedoc", version: "0.0.0", language: "typescript" },
    modules,
  };
}
