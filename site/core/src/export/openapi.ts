/**
 * Converts DocSpec endpoint pages to OpenAPI 3.1.0 specification.
 */

import type { GeneratedPage, EndpointPageData } from "../types/page.js";
import { PageType } from "../types/page.js";

export interface OpenAPISpec {
  openapi: "3.1.0";
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, OpenAPIOperation>>;
}

interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  responses: Record<string, { description: string }>;
  tags?: string[];
}

interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header";
  required?: boolean;
  description?: string;
  schema: { type: string };
}

export function generateOpenAPI(pages: GeneratedPage[], title: string, version: string): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: "3.1.0",
    info: { title, version },
    paths: {},
  };

  const endpoints = pages.filter(p => p.type === PageType.ENDPOINT);

  for (const page of endpoints) {
    const data = page.data as EndpointPageData;
    const ep = data.method.endpointMapping;
    if (!ep || !ep.path) continue;

    const method = (ep.method ?? "GET").toLowerCase();
    const path = ep.path;

    if (!spec.paths[path]) spec.paths[path] = {};

    const parameters: OpenAPIParameter[] = [];
    for (const param of data.method.params ?? []) {
      const inType = path.includes(`{${param.name}}`) ? "path" : "query";
      parameters.push({
        name: param.name,
        in: inType,
        required: param.required ?? inType === "path",
        description: param.description,
        schema: { type: mapJavaTypeToOpenAPI(param.type) },
      });
    }

    spec.paths[path][method] = {
      summary: data.method.description,
      operationId: data.method.name,
      parameters: parameters.length > 0 ? parameters : undefined,
      responses: {
        "200": { description: data.method.returns?.description ?? "Successful response" },
      },
      tags: [data.memberName],
    };
  }

  return spec;
}

function mapJavaTypeToOpenAPI(javaType: string): string {
  const lower = javaType.toLowerCase();
  if (lower.includes("int") || lower.includes("long")) return "integer";
  if (lower.includes("float") || lower.includes("double") || lower.includes("decimal")) return "number";
  if (lower.includes("bool")) return "boolean";
  if (lower.includes("list") || lower.includes("set") || lower.includes("collection")) return "array";
  return "string";
}
