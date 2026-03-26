// @docspec:module {
//   id: "docspec-ts-decorator-reader",
//   name: "Decorator Reader",
//   description: "Reads DocSpec decorators (@DocModule, @DocHidden, @DocAudience) from TypeScript AST nodes and extracts their configuration into a structured DecoratorMeta object for the processor pipeline.",
//   since: "3.0.0"
// }

import ts from "typescript";

export interface DecoratorMeta {
  module?: { name?: string; description?: string };
  extra: Record<string, unknown>;
}

export class DecoratorReader {
  /** @docspec:intentional "Reads DocSpec decorators from an AST node and extracts configuration into a DecoratorMeta object" */
  read(node: ts.Node): DecoratorMeta {
    const result: DecoratorMeta = { extra: {} };
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return result;

    for (const decorator of decorators) {
      if (!ts.isCallExpression(decorator.expression)) continue;
      const name = decorator.expression.expression.getText();

      if (name === "DocModule" && decorator.expression.arguments.length > 0) {
        // Parse module options from first argument
        result.module = this.parseObjectLiteral(decorator.expression.arguments[0]);
      }
      if (name === "DocHidden") {
        result.extra.hidden = true;
      }
      if (name === "DocAudience" && decorator.expression.arguments.length > 0) {
        result.extra.audience = this.parseStringArg(decorator.expression.arguments[0]);
      }
    }

    return result;
  }

  /** @docspec:deterministic */
  private parseObjectLiteral(node: ts.Expression): Record<string, any> {
    if (!ts.isObjectLiteralExpression(node)) return {};
    const result: Record<string, any> = {};
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const key = prop.name.text;
        if (ts.isStringLiteral(prop.initializer)) {
          result[key] = prop.initializer.text;
        } else if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
          result[key] = true;
        } else if (prop.initializer.kind === ts.SyntaxKind.FalseKeyword) {
          result[key] = false;
        }
      }
    }
    return result;
  }

  /** @docspec:deterministic */
  private parseStringArg(node: ts.Expression): string | undefined {
    if (ts.isStringLiteral(node)) return node.text;
    return undefined;
  }
}
