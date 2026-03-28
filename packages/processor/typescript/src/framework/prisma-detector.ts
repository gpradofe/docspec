// @docspec:module {
//   id: "docspec-ts-prisma-detector",
//   name: "Prisma Framework Detector",
//   description: "Detects Prisma ORM presence by scanning source files for @prisma/client import references. Used by the processor to tag the artifact with the 'prisma' framework.",
//   since: "3.0.0"
// }

import ts from "typescript";

/**
 * @docspec:boundary "Prisma ORM framework detection via import scanning"
 */
export class PrismaDetector {
  /** @docspec:intentional "Detects Prisma ORM by scanning source files for @prisma/client import references" */
  detect(program: ts.Program): boolean {
    for (const sf of program.getSourceFiles()) {
      if (sf.isDeclarationFile || sf.fileName.includes("node_modules")) continue;
      if (sf.getFullText().includes("@prisma/client")) return true;
    }
    return false;
  }
}
