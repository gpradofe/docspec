// @docspec:module {
//   id: "docspec-ts-external-dep-extractor",
//   name: "External Dependency Extractor",
//   description: "Detects outbound HTTP calls via axios, fetch, got, superagent, and NestJS HttpService. Tracks axios.create instances for base URL resolution and populates the external dependencies section of the DocSpec model.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
  ExternalDependencyModel,
  ExternalDependencyEndpointModel,
} from "./extractor-interface.js";

/**
 * Detects external HTTP service calls in TypeScript/Node.js projects and populates
 * the external dependencies section of the DocSpec model.
 *
 * @docspec:boundary "AST-based HTTP client call detection for axios, fetch, got, superagent, and NestJS HttpService"
 *
 * Detection targets:
 * - axios: `axios.get(url)`, `axios.post(url)`, `axios.create({baseURL: ...})`
 * - node-fetch / fetch: `fetch(url)`, `fetch(url, {method: 'POST'})`
 * - got: `got(url)`, `got.get(url)`
 * - superagent: `superagent.get(url)`
 * - HttpService (NestJS): `httpService.get(url)`, `httpService.post(url)`
 * - Custom instances: `const api = axios.create({baseURL: ...})`, then `api.get(...)`
 */
export class ExternalDependencyExtractor implements DocSpecExtractor {
  /** HTTP method names used in library APIs */
  private static readonly HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

  /** Known HTTP client libraries / variable names */
  private static readonly HTTP_CLIENTS = [
    "axios", "fetch", "got", "superagent", "request",
    "httpService", "http", "HttpService",
  ];

  /** @docspec:deterministic */
  extractorName(): string {
    return "external-dependency";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for outbound HTTP calls via axios, fetch, got, superagent, and NestJS HttpService" */
  extract(context: ExtractorContext): void {
    /** Track axios.create instances: variable name -> base URL */
    const axiosInstances = new Map<string, string>();
    /** Collected dependencies keyed by base URL or client name */
    const depMap = new Map<string, { model: ExternalDependencyModel; endpoints: ExternalDependencyEndpointModel[] }>();

    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;
      this.visitNode(sourceFile, sourceFile, axiosInstances, depMap);
    }

    for (const { model, endpoints } of depMap.values()) {
      model.endpoints = endpoints;
      context.model.externalDependencies.push(model);
    }
  }

  /** @docspec:intentional "Recursively walks the AST to detect axios.create instances and HTTP method calls" */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    axiosInstances: Map<string, string>,
    depMap: Map<string, { model: ExternalDependencyModel; endpoints: ExternalDependencyEndpointModel[] }>,
  ): void {
    // Detect axios.create({baseURL: '...'})
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
      this.detectAxiosCreate(node, sourceFile, axiosInstances);
    }

    // Detect HTTP calls: axios.get('url'), fetch('url'), etc.
    if (ts.isCallExpression(node)) {
      this.analyzeCallExpression(node, sourceFile, axiosInstances, depMap);
    }

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, axiosInstances, depMap));
  }

  /** @docspec:intentional "Detects axios.create({baseURL: ...}) patterns and tracks instance variable names for URL resolution" */
  private detectAxiosCreate(
    node: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    axiosInstances: Map<string, string>,
  ): void {
    const init = node.initializer as ts.CallExpression;
    const callText = init.expression.getText(sourceFile);

    if (callText !== "axios.create") return;
    if (init.arguments.length === 0) return;

    const configArg = init.arguments[0];
    if (!ts.isObjectLiteralExpression(configArg)) return;

    let baseURL: string | undefined;
    for (const prop of configArg.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)
          && prop.name.text === "baseURL" && ts.isStringLiteral(prop.initializer)) {
        baseURL = prop.initializer.text;
      }
    }

    if (baseURL && ts.isIdentifier(node.name)) {
      axiosInstances.set(node.name.text, baseURL);
    }
  }

  /** @docspec:intentional "Analyzes HTTP method calls on known clients and axios instances to extract dependency endpoints" */
  private analyzeCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    axiosInstances: Map<string, string>,
    depMap: Map<string, { model: ExternalDependencyModel; endpoints: ExternalDependencyEndpointModel[] }>,
  ): void {
    // Case 1: Direct call — fetch('url', {method: 'POST'})
    if (ts.isIdentifier(node.expression) && node.expression.text === "fetch") {
      this.handleFetchCall(node, sourceFile, depMap);
      return;
    }

    // Case 2: Method call — axios.get('url'), httpService.post('url')
    if (!ts.isPropertyAccessExpression(node.expression)) return;

    const objectName = node.expression.expression.getText(sourceFile);
    const methodName = node.expression.name.text;

    // Check if it is an HTTP method call
    if (!ExternalDependencyExtractor.HTTP_METHODS.includes(methodName)) return;

    // Determine if the object is a known HTTP client
    const isKnownClient = ExternalDependencyExtractor.HTTP_CLIENTS.includes(objectName);
    const isAxiosInstance = axiosInstances.has(objectName);

    if (!isKnownClient && !isAxiosInstance) return;

    // Extract URL from first argument
    let url = "(dynamic)";
    if (node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (ts.isStringLiteral(firstArg)) {
        url = firstArg.text;
      } else if (ts.isTemplateExpression(firstArg)) {
        // Template literal: extract the static head
        url = firstArg.head.text + "...";
      } else if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
        url = firstArg.text;
      }
    }

    // Determine base URL and path
    let baseUrl: string;
    let path: string;

    if (isAxiosInstance) {
      baseUrl = axiosInstances.get(objectName)!;
      path = url;
    } else {
      const parsed = this.parseUrl(url);
      baseUrl = parsed.base;
      path = parsed.path;
    }

    const depKey = baseUrl || objectName;
    if (!depMap.has(depKey)) {
      depMap.set(depKey, {
        model: {
          name: this.deriveName(depKey),
          baseUrl: baseUrl || undefined,
          endpoints: [],
        },
        endpoints: [],
      });
    }

    const ownerClass = this.findEnclosingName(node, sourceFile);
    depMap.get(depKey)!.endpoints.push({
      method: methodName.toUpperCase(),
      path: path || "/",
      usedBy: ownerClass ? [ownerClass] : [],
    });
  }

  /** @docspec:intentional "Extracts URL, HTTP method, and owning class from fetch() calls including options-based method override" */
  private handleFetchCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    depMap: Map<string, { model: ExternalDependencyModel; endpoints: ExternalDependencyEndpointModel[] }>,
  ): void {
    let url = "(dynamic)";
    if (node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (ts.isStringLiteral(firstArg)) {
        url = firstArg.text;
      } else if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
        url = firstArg.text;
      } else if (ts.isTemplateExpression(firstArg)) {
        url = firstArg.head.text + "...";
      }
    }

    // Determine HTTP method from options
    let method = "GET";
    if (node.arguments.length >= 2 && ts.isObjectLiteralExpression(node.arguments[1])) {
      for (const prop of node.arguments[1].properties) {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)
            && prop.name.text === "method" && ts.isStringLiteral(prop.initializer)) {
          method = prop.initializer.text.toUpperCase();
        }
      }
    }

    const parsed = this.parseUrl(url);
    const depKey = parsed.base || "fetch";

    if (!depMap.has(depKey)) {
      depMap.set(depKey, {
        model: {
          name: this.deriveName(depKey),
          baseUrl: parsed.base || undefined,
          endpoints: [],
        },
        endpoints: [],
      });
    }

    const ownerClass = this.findEnclosingName(node, sourceFile);
    depMap.get(depKey)!.endpoints.push({
      method,
      path: parsed.path || "/",
      usedBy: ownerClass ? [ownerClass] : [],
    });
  }

  /** @docspec:deterministic */
  private parseUrl(url: string): { base: string; path: string } {
    try {
      const u = new URL(url);
      return { base: `${u.protocol}//${u.host}`, path: u.pathname };
    } catch {
      // Not a full URL; treat as path
      return { base: "", path: url };
    }
  }

  /** @docspec:deterministic */
  private deriveName(key: string): string {
    try {
      const u = new URL(key);
      return u.hostname.replace(/\./g, "-");
    } catch {
      return `external-via-${key}`;
    }
  }

  /** @docspec:deterministic */
  private findEnclosingName(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) return current.name.text;
      if (ts.isMethodDeclaration(current) && current.name) return current.name.getText(sourceFile);
      if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
      current = current.parent;
    }
    return null;
  }
}
