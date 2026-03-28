// @docspec:module {
//   id: "docspec-ts-typeorm-detector",
//   name: "TypeORM Framework Detector",
//   description: "Detects TypeORM presence by scanning for 'typeorm' references in source files, and enriches discovered class members with entity stereotypes when @Entity decorators are found.",
//   since: "3.0.0"
// }

import ts from "typescript";

/**
 * @docspec:boundary "TypeORM framework detection and entity enrichment"
 */
export class TypeORMDetector {
  /** @docspec:intentional "Detects TypeORM by scanning source files for typeorm package references" */
  detect(program: ts.Program): boolean {
    for (const sf of program.getSourceFiles()) {
      if (sf.isDeclarationFile || sf.fileName.includes("node_modules")) continue;
      if (sf.getFullText().includes("typeorm")) return true;
    }
    return false;
  }

  /** @docspec:intentional "Enriches class members with entity stereotype when @Entity decorator is found" */
  enrich(node: ts.ClassDeclaration, member: any): void {
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return;

    for (const d of decorators) {
      if (!ts.isCallExpression(d.expression)) continue;
      const name = d.expression.expression.getText();
      if (name === "Entity") {
        member.kindCategory = "entity";
        member.stereotype = "entity";
      }
    }
  }
}
