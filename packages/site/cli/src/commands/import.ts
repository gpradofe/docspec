import * as fs from "node:fs";
import * as path from "node:path";

export type ImportFormat = "javadoc" | "typedoc" | "swagger" | "openapi";

export interface ImportOptions {
  format: ImportFormat;
  inputPath: string;
  outputPath?: string;
}

export async function importDocs(options: ImportOptions): Promise<void> {
  const outputPath = options.outputPath ?? "target/docspec.json";

  console.log(`DocSpec: Importing from ${options.format} at ${options.inputPath}...`);

  if (!fs.existsSync(options.inputPath)) {
    throw new Error(`Input not found: ${options.inputPath}`);
  }

  let spec: any;
  switch (options.format) {
    case "swagger":
    case "openapi":
      spec = await importOpenAPI(options.inputPath);
      break;
    case "javadoc":
      spec = await importJavadoc(options.inputPath);
      break;
    case "typedoc":
      spec = await importTypedoc(options.inputPath);
      break;
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), "utf-8");
  console.log(`DocSpec: Imported to ${outputPath}`);
}

async function importOpenAPI(inputPath: string): Promise<any> {
  const content = fs.readFileSync(inputPath, "utf-8");
  const openapi = JSON.parse(content);

  const modules: any[] = [];
  const members: any[] = [];

  // Convert paths to endpoints
  for (const [path, methods] of Object.entries(openapi.paths ?? {})) {
    for (const [method, op] of Object.entries(methods as any)) {
      if (typeof op !== "object") continue;
      members.push({
        kind: "class",
        name: (op as any).operationId ?? `${method}_${path}`,
        qualified: `api${path.replace(/\//g, ".")}`,
        description: (op as any).summary ?? (op as any).description,
        methods: [{
          name: (op as any).operationId ?? method,
          description: (op as any).description,
          endpointMapping: { method: method.toUpperCase(), path },
        }],
      });
    }
  }

  if (members.length > 0) {
    modules.push({ id: "api", name: "API", members });
  }

  return {
    docspec: "3.0.0",
    artifact: { groupId: "imported", artifactId: openapi.info?.title ?? "api", version: openapi.info?.version ?? "0.0.0", language: "openapi" },
    modules,
  };
}

async function importJavadoc(inputPath: string): Promise<any> {
  // Basic javadoc HTML import — placeholder
  return {
    docspec: "3.0.0",
    artifact: { groupId: "imported", artifactId: "javadoc", version: "0.0.0", language: "java" },
    modules: [],
  };
}

async function importTypedoc(inputPath: string): Promise<any> {
  const content = fs.readFileSync(inputPath, "utf-8");
  const typedoc = JSON.parse(content);

  return {
    docspec: "3.0.0",
    artifact: { groupId: "imported", artifactId: typedoc.name ?? "typedoc", version: "0.0.0", language: "typescript" },
    modules: [],
  };
}
