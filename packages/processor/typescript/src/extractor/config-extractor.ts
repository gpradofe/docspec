// @docspec:module {
//   id: "docspec-ts-config-extractor",
//   name: "Configuration Extractor",
//   description: "Detects environment variable access (process.env), NestJS ConfigService calls, and default value patterns to populate the configuration section of the DocSpec model with discovered property keys, sources, and consumers.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
  ConfigurationPropertyModel,
} from "./extractor-interface.js";

/**
 * Detects configuration patterns in TypeScript/Node.js projects and populates
 * the configuration section of the DocSpec model.
 *
 * @docspec:boundary "AST-based configuration property discovery for Node.js and NestJS"
 *
 * Detection targets:
 * - dotenv: `process.env.KEY` access patterns
 * - config files: `config.get('key')`, `config['key']` patterns
 * - NestJS ConfigService: `configService.get('key')`, `configService.getOrThrow('key')`
 * - Default values: `process.env.KEY || 'default'`, `process.env.KEY ?? 'default'`
 */
export class ConfigExtractor implements DocSpecExtractor {
  /** Pattern to match process.env.KEY access */
  private static readonly PROCESS_ENV_REGEX = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

  /** Config getter method names */
  private static readonly CONFIG_GETTERS = [
    "get", "getOrThrow", "getOptional", "getConfig",
  ];

  /** @docspec:deterministic */
  extractorName(): string {
    return "configuration";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for environment variable access and config getter patterns to populate the configuration model" */
  extract(context: ExtractorContext): void {
    const properties = new Map<string, ConfigurationPropertyModel>();

    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;
      this.visitNode(sourceFile, sourceFile, properties);
    }

    if (properties.size > 0) {
      context.model.configuration.push(...properties.values());
    }
  }

  /** @docspec:intentional "Recursively walks the AST to detect process.env access, element access, config getters, and default values" */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    properties: Map<string, ConfigurationPropertyModel>,
  ): void {
    // Detect process.env.KEY patterns
    if (ts.isPropertyAccessExpression(node)) {
      this.analyzePropertyAccess(node, sourceFile, properties);
    }

    // Detect process.env['KEY'] or process.env["KEY"]
    if (ts.isElementAccessExpression(node)) {
      this.analyzeElementAccess(node, sourceFile, properties);
    }

    // Detect config.get('key') patterns
    if (ts.isCallExpression(node)) {
      this.analyzeCallExpression(node, sourceFile, properties);
    }

    // Detect default values in binary expressions: process.env.KEY || 'default'
    if (ts.isBinaryExpression(node)) {
      this.analyzeDefaultValue(node, sourceFile, properties);
    }

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, properties));
  }

  /** @docspec:intentional "Detects process.env.KEY property access patterns and registers discovered config keys" */
  private analyzePropertyAccess(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    properties: Map<string, ConfigurationPropertyModel>,
  ): void {
    const expressionText = node.expression.getText(sourceFile);
    if (expressionText === "process.env") {
      const key = node.name.text;
      if (!properties.has(key)) {
        const ownerClass = this.findEnclosingClassName(node, sourceFile);
        properties.set(key, {
          key,
          source: "process.env",
          usedBy: ownerClass ? [ownerClass] : [],
        });
      } else if (properties.has(key)) {
        const ownerClass = this.findEnclosingClassName(node, sourceFile);
        if (ownerClass) {
          const existing = properties.get(key)!;
          if (!existing.usedBy.includes(ownerClass)) {
            existing.usedBy.push(ownerClass);
          }
        }
      }
    }
  }

  /** @docspec:intentional "Detects process.env['KEY'] bracket-access patterns and registers discovered config keys" */
  private analyzeElementAccess(
    node: ts.ElementAccessExpression,
    sourceFile: ts.SourceFile,
    properties: Map<string, ConfigurationPropertyModel>,
  ): void {
    const expressionText = node.expression.getText(sourceFile);
    if (expressionText === "process.env" && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
      const key = node.argumentExpression.text;
      if (!properties.has(key)) {
        const ownerClass = this.findEnclosingClassName(node, sourceFile);
        properties.set(key, {
          key,
          source: "process.env",
          usedBy: ownerClass ? [ownerClass] : [],
        });
      }
    }
  }

  /** @docspec:intentional "Detects configService.get/getOrThrow calls and extracts config key names with optional default values" */
  private analyzeCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    properties: Map<string, ConfigurationPropertyModel>,
  ): void {
    if (!ts.isPropertyAccessExpression(node.expression)) return;
    const methodName = node.expression.name.text;
    const objectText = node.expression.expression.getText(sourceFile);

    // configService.get('KEY'), config.get('KEY'), etc.
    const isConfigCall = ConfigExtractor.CONFIG_GETTERS.includes(methodName)
      && (objectText.includes("config") || objectText.includes("Config"));

    if (!isConfigCall) return;
    if (node.arguments.length === 0) return;

    const firstArg = node.arguments[0];
    if (!ts.isStringLiteral(firstArg)) return;

    const key = firstArg.text;
    if (!properties.has(key)) {
      const ownerClass = this.findEnclosingClassName(node, sourceFile);

      // Check for default value in second argument
      let defaultValue: string | undefined;
      if (node.arguments.length >= 2) {
        const secondArg = node.arguments[1];
        if (ts.isStringLiteral(secondArg)) {
          defaultValue = secondArg.text;
        } else if (ts.isNumericLiteral(secondArg)) {
          defaultValue = secondArg.text;
        } else if (secondArg.kind === ts.SyntaxKind.TrueKeyword) {
          defaultValue = "true";
        } else if (secondArg.kind === ts.SyntaxKind.FalseKeyword) {
          defaultValue = "false";
        }
      }

      properties.set(key, {
        key,
        defaultValue,
        source: `${objectText}.${methodName}`,
        usedBy: ownerClass ? [ownerClass] : [],
      });
    }
  }

  /** @docspec:intentional "Extracts default values from process.env.KEY || 'default' and ?? 'default' binary expressions" */
  private analyzeDefaultValue(
    node: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    properties: Map<string, ConfigurationPropertyModel>,
  ): void {
    // process.env.KEY || 'default' or process.env.KEY ?? 'default'
    const isDefaultOp =
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken;

    if (!isDefaultOp) return;

    const leftText = node.left.getText(sourceFile);
    const envMatch = /^process\.env\.([A-Z_][A-Z0-9_]*)$/.exec(leftText);
    if (!envMatch) return;

    const key = envMatch[1];
    const existing = properties.get(key);
    if (existing && !existing.defaultValue) {
      if (ts.isStringLiteral(node.right)) {
        existing.defaultValue = node.right.text;
      } else if (ts.isNumericLiteral(node.right)) {
        existing.defaultValue = node.right.text;
      }
    }
  }

  /** @docspec:deterministic */
  private findEnclosingClassName(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) {
        return current.name.text;
      }
      if (ts.isFunctionDeclaration(current) && current.name) {
        return current.name.text;
      }
      current = current.parent;
    }
    // Fall back to file name
    const fileName = sourceFile.fileName.replace(/\\/g, "/");
    const parts = fileName.replace(/\.tsx?$/, "").split("/");
    return parts[parts.length - 1] ?? null;
  }
}
