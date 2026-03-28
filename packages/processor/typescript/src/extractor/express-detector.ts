// @docspec:module {
//   id: "docspec-ts-express-detector",
//   name: "Express.js Detector",
//   description: "Detects Express.js route registrations (app.get, router.post), middleware mounts (app.use), Router creation, chained routes, and enriches the DocSpec security model with discovered endpoint auth information.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
} from "./extractor-interface.js";

/**
 * Detects Express.js framework patterns (routes, middleware, routers) and
 * enriches the DocSpec model with endpoint information.
 *
 * @docspec:boundary "AST-based Express.js route and middleware detection"
 *
 * Detection targets:
 * - Express app routes: `app.get('/path', handler)`, `app.post('/path', handler)`
 * - Express Router: `router.get('/path', handler)`, `const router = express.Router()`
 * - Middleware registration: `app.use(middleware)`, `app.use('/path', middleware)`
 * - Error handlers: `app.use((err, req, res, next) => {...})`
 * - Static file serving: `app.use(express.static('public'))`
 * - Template engine: `app.set('view engine', 'ejs')`
 */
export class ExpressDetector implements DocSpecExtractor {
  /** HTTP method names used in Express routing */
  private static readonly ROUTE_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "all"];

  /** Variable names commonly used for Express app instances */
  private static readonly APP_NAMES = ["app", "server", "express"];

  /** Variable names commonly used for Express Router instances */
  private static readonly ROUTER_NAMES = ["router", "apiRouter", "authRouter", "adminRouter"];

  /** @docspec:deterministic */
  extractorName(): string {
    return "express";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for Express.js route registrations, middleware, and Router patterns" */
  extract(context: ExtractorContext): void {
    const routes: ExpressRoute[] = [];
    const middleware: string[] = [];
    const routers = new Set<string>();
    let expressDetected = false;

    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;

      // Quick check if this file uses Express
      const fullText = sourceFile.getFullText();
      if (fullText.includes("express") || fullText.includes("Router()")) {
        expressDetected = true;
      }

      this.visitNode(sourceFile, sourceFile, routes, middleware, routers);
    }

    if (!expressDetected || routes.length === 0) return;

    // Convert Express routes to DocSpec module members with endpoints
    this.enrichModel(context, routes, middleware);
  }

  /** @docspec:intentional "Recursively walks the AST to detect Router creation, route registrations, and middleware mounts" */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    routes: ExpressRoute[],
    middleware: string[],
    routers: Set<string>,
  ): void {
    // Detect Router creation: const router = express.Router()
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
      const callText = node.initializer.expression.getText(sourceFile);
      if (callText === "express.Router" || callText === "Router") {
        if (ts.isIdentifier(node.name)) {
          routers.add(node.name.text);
        }
      }
    }

    // Detect route registrations: app.get('/path', handler)
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const objectName = node.expression.expression.getText(sourceFile);
      const methodName = node.expression.name.text;

      const isAppOrRouter =
        ExpressDetector.APP_NAMES.includes(objectName) ||
        ExpressDetector.ROUTER_NAMES.includes(objectName) ||
        routers.has(objectName);

      if (isAppOrRouter) {
        if (ExpressDetector.ROUTE_METHODS.includes(methodName)) {
          this.extractRoute(node, sourceFile, methodName, objectName, routes);
        } else if (methodName === "use") {
          this.extractMiddleware(node, sourceFile, middleware, routes, objectName);
        } else if (methodName === "route") {
          // app.route('/path').get(handler).post(handler)
          this.extractChainedRoute(node, sourceFile, routes);
        }
      }
    }

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, routes, middleware, routers));
  }

  /** @docspec:intentional "Extracts route path, HTTP method, handler name, and inline middleware from an Express route call" */
  private extractRoute(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    method: string,
    router: string,
    routes: ExpressRoute[],
  ): void {
    if (node.arguments.length === 0) return;

    let path = "/";
    const firstArg = node.arguments[0];
    if (ts.isStringLiteral(firstArg)) {
      path = firstArg.text;
    } else if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      path = firstArg.text;
    }

    // Check for inline middleware (multiple handlers before the last one)
    const middlewareNames: string[] = [];
    const handlers = node.arguments.length > 1 ? Array.from(node.arguments).slice(1) : [];
    for (const handler of handlers) {
      if (ts.isIdentifier(handler)) {
        middlewareNames.push(handler.text);
      }
    }

    // Determine handler name
    let handlerName: string | undefined;
    const lastArg = node.arguments[node.arguments.length - 1];
    if (ts.isIdentifier(lastArg)) {
      handlerName = lastArg.text;
    } else if (ts.isPropertyAccessExpression(lastArg)) {
      handlerName = lastArg.getText(sourceFile);
    }

    routes.push({
      method: method.toUpperCase(),
      path,
      handler: handlerName,
      router,
      middleware: middlewareNames.length > 0 ? middlewareNames : undefined,
    });
  }

  /** @docspec:intentional "Extracts middleware mount paths and middleware function names from app.use/router.use calls" */
  private extractMiddleware(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    middleware: string[],
    routes: ExpressRoute[],
    router: string,
  ): void {
    if (node.arguments.length === 0) return;

    const firstArg = node.arguments[0];

    // app.use('/path', router) -- mount path
    if (ts.isStringLiteral(firstArg) && node.arguments.length >= 2) {
      const mountPath = firstArg.text;
      const secondArg = node.arguments[1];
      if (ts.isIdentifier(secondArg)) {
        routes.push({
          method: "USE",
          path: mountPath,
          handler: secondArg.text,
          router,
        });
      }
      return;
    }

    // app.use(middleware)
    if (ts.isIdentifier(firstArg)) {
      middleware.push(firstArg.text);
    } else if (ts.isCallExpression(firstArg)) {
      const callText = firstArg.expression.getText(sourceFile);
      middleware.push(callText);
    }
  }

  /** @docspec:intentional "Extracts routes from chained app.route('/path').get().post() patterns" */
  private extractChainedRoute(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    routes: ExpressRoute[],
  ): void {
    if (node.arguments.length === 0) return;

    let path = "/";
    const firstArg = node.arguments[0];
    if (ts.isStringLiteral(firstArg)) {
      path = firstArg.text;
    }

    // Walk up the chain to find .get().post() calls
    let parent = node.parent;
    while (parent) {
      if (ts.isPropertyAccessExpression(parent) && parent.parent && ts.isCallExpression(parent.parent)) {
        const chainMethod = parent.name.text;
        if (ExpressDetector.ROUTE_METHODS.includes(chainMethod)) {
          routes.push({
            method: chainMethod.toUpperCase(),
            path,
            router: "route-chain",
          });
        }
      }
      parent = parent.parent;
    }
  }

  /** @docspec:intentional "Merges discovered Express routes into the DocSpec security model with auth middleware analysis" */
  private enrichModel(
    context: ExtractorContext,
    routes: ExpressRoute[],
    middleware: string[],
  ): void {
    // Add discovered Express routes as endpoint-like entries in the output.
    // The processor's main pipeline will merge these into modules.
    // For now, store them as part of the model's security endpoints and
    // external tracking — the processor can read these and create members.

    // Express routes contribute to the security model by showing public/private endpoints
    for (const route of routes) {
      if (route.method === "USE") continue; // Skip middleware mounts for security

      // Check if route has auth middleware
      const hasAuth = route.middleware?.some(m =>
        m.toLowerCase().includes("auth") ||
        m.toLowerCase().includes("jwt") ||
        m.toLowerCase().includes("passport") ||
        m.toLowerCase().includes("protect"),
      );

      if (context.model.security) {
        context.model.security.endpoints.push({
          path: route.path,
          method: route.method,
          rules: route.middleware ? route.middleware.map(m => `Middleware: ${m}`) : [],
          public: !hasAuth,
        });
      }
    }
  }
}

/** Internal representation of a discovered Express route */
interface ExpressRoute {
  method: string;
  path: string;
  handler?: string;
  router: string;
  middleware?: string[];
}
