// @docspec:module {
//   id: "docspec-ts-security-extractor",
//   name: "Security Extractor",
//   description: "Detects authentication and authorization patterns in Express/NestJS codebases — passport strategies, guards, role decorators, and middleware-based auth — and populates the security section of the DocSpec model.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
  SecurityEndpointRuleModel,
  SecurityModel,
} from "./extractor-interface.js";

/**
 * Detects Express/NestJS middleware auth patterns and populates the security
 * section of the DocSpec model.
 *
 * @docspec:boundary "AST-based security pattern detection across Express and NestJS frameworks"
 *
 * Detection targets:
 * - Express middleware: `passport.authenticate(...)`, `jwt(...)`, custom auth middleware
 * - NestJS guards: `@UseGuards(AuthGuard)`, `@Roles(...)`, `@SetMetadata('roles', ...)`
 * - Manual role checks: `req.user.role`, `req.isAuthenticated()`
 * - Route-level patterns: `router.use(authMiddleware)`, `app.use('/api', auth)`
 */
export class SecurityExtractor implements DocSpecExtractor {
  /** Decorator names that imply security guards */
  private static readonly GUARD_DECORATORS = ["UseGuards", "Roles", "SetMetadata"];

  /** Middleware function names that imply authentication */
  private static readonly AUTH_MIDDLEWARE_NAMES = [
    "authenticate", "passport", "jwt", "auth", "authMiddleware",
    "requireAuth", "requireLogin", "isAuthenticated", "ensureAuthenticated",
    "verifyToken", "checkAuth", "protect", "authorize",
  ];

  /** Patterns in source text that signal role-based access */
  private static readonly ROLE_PATTERNS = [
    /req\.user\.role/g,
    /req\.isAuthenticated\(\)/g,
    /hasRole\(['"]([^'"]+)['"]\)/g,
    /role\s*===?\s*['"]([^'"]+)['"]/g,
    /roles?\s*\.includes\(['"]([^'"]+)['"]\)/g,
  ];

  /** @docspec:deterministic */
  extractorName(): string {
    return "security";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for authentication and authorization patterns and populates the security model" */
  extract(context: ExtractorContext): void {
    const roles = new Set<string>();
    const endpoints: SecurityEndpointRuleModel[] = [];

    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;
      this.visitNode(sourceFile, sourceFile, roles, endpoints);
    }

    if (roles.size === 0 && endpoints.length === 0) return;

    const security: SecurityModel = context.model.security ?? { roles: [], endpoints: [] };
    const existingRoles = new Set(security.roles);
    for (const role of roles) existingRoles.add(role);
    security.roles = [...existingRoles];
    security.endpoints.push(...endpoints);
    context.model.security = security;
  }

  /** @docspec:intentional "Recursively walks the AST to detect guard decorators, auth middleware calls, and role-check patterns" */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    roles: Set<string>,
    endpoints: SecurityEndpointRuleModel[],
  ): void {
    // Check decorators on classes and methods
    if (ts.isClassDeclaration(node) || ts.isMethodDeclaration(node)) {
      const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
      if (decorators) {
        for (const decorator of decorators) {
          this.analyzeDecorator(decorator, sourceFile, roles, endpoints, node);
        }
      }
    }

    // Check call expressions for middleware patterns
    if (ts.isCallExpression(node)) {
      this.analyzeCallExpression(node, sourceFile, roles, endpoints);
    }

    // Check source text for role patterns
    if (ts.isMethodDeclaration(node) && node.body) {
      const bodyText = node.body.getText(sourceFile);
      for (const pattern of SecurityExtractor.ROLE_PATTERNS) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(bodyText)) !== null) {
          if (match[1]) {
            roles.add(match[1]);
          }
        }
      }
    }

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, roles, endpoints));
  }

  /** @docspec:intentional "Extracts security metadata from UseGuards, Roles, and SetMetadata NestJS decorators" */
  private analyzeDecorator(
    decorator: ts.Decorator,
    sourceFile: ts.SourceFile,
    roles: Set<string>,
    endpoints: SecurityEndpointRuleModel[],
    parentNode: ts.Node,
  ): void {
    if (!ts.isCallExpression(decorator.expression)) return;
    const name = decorator.expression.expression.getText(sourceFile);

    if (name === "UseGuards") {
      const rules: string[] = [];
      for (const arg of decorator.expression.arguments) {
        const guardName = arg.getText(sourceFile);
        rules.push(`Guard: ${guardName}`);
      }
      if (rules.length > 0 && ts.isMethodDeclaration(parentNode) && parentNode.name) {
        endpoints.push({
          path: parentNode.name.getText(sourceFile),
          rules,
          public: false,
        });
      }
    }

    if (name === "Roles") {
      for (const arg of decorator.expression.arguments) {
        if (ts.isStringLiteral(arg)) {
          roles.add(arg.text);
        }
      }
    }

    if (name === "SetMetadata") {
      const args = decorator.expression.arguments;
      if (args.length >= 2 && ts.isStringLiteral(args[0]) && args[0].text === "roles") {
        if (ts.isArrayLiteralExpression(args[1])) {
          for (const el of args[1].elements) {
            if (ts.isStringLiteral(el)) {
              roles.add(el.text);
            }
          }
        }
      }
    }
  }

  /** @docspec:intentional "Detects passport.authenticate and auth middleware call patterns in Express-style routing" */
  private analyzeCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    roles: Set<string>,
    endpoints: SecurityEndpointRuleModel[],
  ): void {
    const callText = node.expression.getText(sourceFile);

    // passport.authenticate('strategy')
    if (callText.includes("passport.authenticate") || callText.includes("passport.session")) {
      const rules: string[] = [`Middleware: ${callText}`];
      for (const arg of node.arguments) {
        if (ts.isStringLiteral(arg)) {
          rules.push(`Strategy: ${arg.text}`);
        }
      }
      endpoints.push({ path: "(middleware)", rules, public: false });
    }

    // app.use or router.use with auth middleware
    if (callText.endsWith(".use")) {
      for (const arg of node.arguments) {
        const argText = arg.getText(sourceFile);
        if (SecurityExtractor.AUTH_MIDDLEWARE_NAMES.some(m => argText.includes(m))) {
          let path = "(global)";
          if (node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0])) {
            path = node.arguments[0].text;
          }
          endpoints.push({
            path,
            rules: [`Middleware: ${argText}`],
            public: false,
          });
        }
      }
    }
  }
}
