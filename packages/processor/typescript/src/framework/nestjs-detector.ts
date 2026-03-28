// @docspec:module {
//   id: "docspec-ts-nestjs-detector",
//   name: "NestJS Framework Detector",
//   description: "Detects NestJS framework presence by scanning for @nestjs/ imports, and enriches discovered class members with NestJS stereotypes (controller, service, module) based on @Controller, @Injectable, and @Module decorators.",
//   since: "3.0.0"
// }

import ts from "typescript";

/**
 * @docspec:boundary "NestJS framework detection and member enrichment"
 */
export class NestJSDetector {
  /** @docspec:intentional "Detects NestJS framework by scanning for @nestjs/ package imports in source files" */
  detect(program: ts.Program): boolean {
    for (const sf of program.getSourceFiles()) {
      if (sf.fileName.includes("@nestjs/common")) return true;
    }
    // Check if any source imports from @nestjs
    for (const sf of program.getSourceFiles()) {
      if (sf.isDeclarationFile || sf.fileName.includes("node_modules")) continue;
      const text = sf.getFullText();
      if (text.includes("@nestjs/")) return true;
    }
    return false;
  }

  /** @docspec:intentional "Enriches class members with NestJS stereotypes (controller, service, module) based on decorator analysis" */
  enrich(node: ts.ClassDeclaration, member: any): void {
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return;

    for (const d of decorators) {
      if (!ts.isCallExpression(d.expression)) continue;
      const name = d.expression.expression.getText();
      if (name === "Controller") {
        member.kindCategory = "controller";
        member.stereotype = "api";
      } else if (name === "Injectable") {
        if (!member.kindCategory) member.kindCategory = "service";
        if (!member.stereotype) member.stereotype = "service";
      } else if (name === "Module") {
        member.kindCategory = "config";
        member.stereotype = "configuration";
      }
    }
  }
}
