import * as fs from "node:fs";

/**
 * Import Swagger/OpenAPI JSON into DocSpec format.
 */
export interface SwaggerImportOptions {
  inputPath: string;
}

export async function importSwagger(options: SwaggerImportOptions): Promise<any> {
  console.log(`Importing Swagger/OpenAPI from ${options.inputPath}...`);

  const content = fs.readFileSync(options.inputPath, "utf-8");
  const swagger = JSON.parse(content);
  const members: any[] = [];

  for (const [path, methods] of Object.entries(swagger.paths ?? {})) {
    for (const [method, op] of Object.entries(methods as any)) {
      if (typeof op !== "object") continue;
      const operation = op as any;
      members.push({
        kind: "class",
        name: operation.operationId ?? `${method}_${path.replace(/\//g, "_")}`,
        qualified: `api${path.replace(/\//g, ".")}`,
        description: operation.summary,
        methods: [{
          name: operation.operationId ?? method,
          description: operation.description,
          endpointMapping: { method: method.toUpperCase(), path },
          params: (operation.parameters ?? []).map((p: any) => ({
            name: p.name,
            type: p.schema?.type ?? "string",
            required: p.required ?? false,
            description: p.description,
          })),
        }],
      });
    }
  }

  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "imported",
      artifactId: swagger.info?.title ?? "api",
      version: swagger.info?.version ?? "0.0.0",
      language: "openapi",
    },
    modules: members.length > 0 ? [{ id: "api", name: "API", members }] : [],
  };
}
