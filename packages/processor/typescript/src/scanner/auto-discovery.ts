// @docspec:module {
//   id: "docspec-ts-auto-discovery",
//   name: "Auto-Discovery Scanner",
//   description: "Scans a TypeScript program for all exported classes, interfaces, enums, type aliases, and functions. This is the Tier 0 entry point that discovers documentable types without requiring any decorators.",
//   since: "3.0.0"
// }

import ts from "typescript";

export interface DiscoveredType {
  name: string;
  qualified: string;
  fileName: string;
  sourceFile: ts.SourceFile;
  node: ts.ClassDeclaration | ts.InterfaceDeclaration | ts.EnumDeclaration | ts.TypeAliasDeclaration | ts.FunctionDeclaration;
  kind: string;
}

export class AutoDiscoveryScanner {
  /** @docspec:intentional "Scans all non-declaration source files for exported classes, interfaces, enums, type aliases, and functions" */
  scan(program: ts.Program, checker: ts.TypeChecker): DiscoveredType[] {
    const types: DiscoveredType[] = [];

    for (const sourceFile of program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;
      if (sourceFile.fileName.includes("node_modules")) continue;

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isClassDeclaration(node) && node.name && this.isExported(node)) {
          types.push({
            name: node.name.text,
            qualified: this.getQualified(sourceFile, node.name.text),
            fileName: sourceFile.fileName,
            sourceFile,
            node,
            kind: "class",
          });
        } else if (ts.isInterfaceDeclaration(node) && node.name && this.isExported(node)) {
          types.push({
            name: node.name.text,
            qualified: this.getQualified(sourceFile, node.name.text),
            fileName: sourceFile.fileName,
            sourceFile,
            node,
            kind: "interface",
          });
        } else if (ts.isEnumDeclaration(node) && node.name && this.isExported(node)) {
          types.push({
            name: node.name.text,
            qualified: this.getQualified(sourceFile, node.name.text),
            fileName: sourceFile.fileName,
            sourceFile,
            node,
            kind: "enum",
          });
        } else if (ts.isTypeAliasDeclaration(node) && node.name && this.isExported(node)) {
          types.push({
            name: node.name.text,
            qualified: this.getQualified(sourceFile, node.name.text),
            fileName: sourceFile.fileName,
            sourceFile,
            node,
            kind: "type_alias",
          });
        } else if (ts.isFunctionDeclaration(node) && node.name && this.isExported(node)) {
          types.push({
            name: node.name.text,
            qualified: this.getQualified(sourceFile, node.name.text),
            fileName: sourceFile.fileName,
            sourceFile,
            node,
            kind: "function",
          });
        }
      });
    }

    return types;
  }

  /** @docspec:deterministic */
  private isExported(node: ts.Declaration): boolean {
    return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
  }

  /** @docspec:deterministic */
  private getQualified(sourceFile: ts.SourceFile, name: string): string {
    const fileName = sourceFile.fileName.replace(/\\/g, "/");
    const parts = fileName.replace(/\.tsx?$/, "").split("/");
    const srcIdx = parts.indexOf("src");
    const relevant = srcIdx >= 0 ? parts.slice(srcIdx + 1) : parts.slice(-2);
    return [...relevant, name].join(".");
  }
}
