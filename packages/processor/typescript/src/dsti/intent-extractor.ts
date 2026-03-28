/**
 * @docspec:module id="docspec-ts-intent-extractor" name="DSTI Intent Extractor"
 * @docspec:description "Extracts all 13 DSTI intent signal channels from TypeScript
 *   method AST nodes. Channels: nameSemantics, guardClauses, branches, dataFlow,
 *   loopProperties, errorHandling, constants, nullChecks, assertions, logStatements,
 *   dependencies, validationAnnotations, returnType (via nameSemantics). Uses the
 *   TypeScript Compiler API for precise syntax tree analysis."
 * @docspec:boundary "processor-internal"
 * @docspec:since "3.0.0"
 */
import ts from "typescript";

export interface ExtractedSignals {
  nameSemantics?: { verb?: string; object?: string; intent?: string };
  guardClauses?: number;
  branches?: number;
  dataFlow?: { reads: string[]; writes: string[] };
  loopProperties?: { hasStreams?: boolean; hasEnhancedFor?: boolean; streamOps?: string[] };
  errorHandling?: { catchBlocks: number; caughtTypes: string[] };
  constants?: string[];
  dependencies?: string[];
  nullChecks?: number;
  assertions?: number;
  validationAnnotations?: number;
  logStatements?: number;
  intentDensityScore?: number;
}

const VERB_INTENT_MAP: Record<string, string> = {
  get: "query", find: "query", fetch: "query", load: "query", read: "query", list: "query", search: "query",
  create: "creation", add: "creation", insert: "creation", save: "creation", register: "creation",
  update: "mutation", modify: "mutation", patch: "mutation", set: "mutation", change: "mutation",
  delete: "deletion", remove: "deletion", destroy: "deletion", drop: "deletion",
  validate: "validation", check: "validation", verify: "validation", assert: "validation",
  process: "transformation", handle: "transformation", execute: "transformation", transform: "transformation",
  convert: "transformation", map: "transformation", parse: "transformation",
  send: "communication", publish: "communication", emit: "communication", notify: "communication",
  calculate: "calculation", compute: "calculation", count: "calculation", sum: "calculation",
  is: "query", has: "query", can: "query",
};

export class IntentExtractor {
  extractFromMethod(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): ExtractedSignals | null {
    const name = node.name?.getText(sourceFile);
    if (!name) return null;

    const signals: ExtractedSignals = {};

    // 1. Name semantics
    const words = name.replace(/([A-Z])/g, " $1").trim().split(/\s+/);
    const verb = words[0].toLowerCase();
    signals.nameSemantics = {
      verb,
      object: words.slice(1).join(""),
      intent: VERB_INTENT_MAP[verb] ?? "unknown",
    };

    // 2-13. Analyze method body
    if (node.body) {
      const bodyText = node.body.getText(sourceFile);
      signals.guardClauses = this.countGuards(node.body);
      signals.branches = this.countBranches(node.body);
      signals.nullChecks = this.countNullChecks(bodyText);
      signals.logStatements = this.countLogStatements(bodyText);
      signals.assertions = this.countAssertions(bodyText);
      signals.constants = this.extractConstants(node.body, sourceFile);
      signals.dependencies = this.extractDependencies(node.body, sourceFile);
      signals.errorHandling = this.analyzeErrorHandling(node.body, sourceFile);
      signals.loopProperties = this.analyzeLoops(node.body);
      signals.dataFlow = this.analyzeDataFlow(node.body, sourceFile);
      signals.validationAnnotations = this.countValidationAnnotations(bodyText);
    }

    return signals;
  }

  private countGuards(body: ts.Block): number {
    let count = 0;
    const visit = (node: ts.Node) => {
      if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement)) {
        const stmts = node.thenStatement.statements;
        if (stmts.length === 1 && (ts.isThrowStatement(stmts[0]) || ts.isReturnStatement(stmts[0]))) {
          count++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    return count;
  }

  private countBranches(body: ts.Block): number {
    let count = 0;
    const visit = (node: ts.Node) => {
      if (ts.isIfStatement(node) || ts.isConditionalExpression(node) || ts.isSwitchStatement(node)) count++;
      ts.forEachChild(node, visit);
    };
    visit(body);
    return count;
  }

  private countNullChecks(text: string): number {
    return (text.match(/!==?\s*(null|undefined)|===?\s*(null|undefined)|\?\./g) ?? []).length;
  }

  private countLogStatements(text: string): number {
    return (text.match(/console\.(log|warn|error|info|debug)|logger\./g) ?? []).length;
  }

  private countAssertions(text: string): number {
    return (text.match(/assert|expect\(|should\./g) ?? []).length;
  }

  private countValidationAnnotations(text: string): number {
    // class-validator type decorators
    const classValidatorTypes = (text.match(
      /@(IsString|IsEmail|IsNumber|IsInt|IsBoolean|IsDate|IsEnum|IsOptional|IsNotEmpty|IsArray|IsUUID|IsUrl)\b/g
    ) ?? []).length;

    // class-validator constraint decorators
    const classValidatorConstraints = (text.match(
      /@(Min|Max|MinLength|MaxLength|Length|Matches|Contains)\b/g
    ) ?? []).length;

    // class-validator advanced decorators
    const classValidatorAdvanced = (text.match(
      /@(ValidateNested|ValidateIf|IsDefined)\b/g
    ) ?? []).length;

    // Joi validation patterns (e.g., Joi.string(), Joi.number(), Joi.object(), etc.)
    const joiPatterns = (text.match(
      /Joi\.(string|number|boolean|date|object|array|alternatives|any|binary|func|link|ref|symbol)\s*\(/g
    ) ?? []).length;

    // Zod validation patterns (e.g., z.string(), z.number(), z.object(), etc.)
    const zodPatterns = (text.match(
      /z\.(string|number|boolean|date|object|array|enum|union|intersection|tuple|record|map|set|literal|nativeEnum|optional|nullable|any|unknown|void|never|undefined|null|bigint|nan|symbol|function|lazy|preprocess|pipeline|coerce)\s*\(/g
    ) ?? []).length;

    return classValidatorTypes + classValidatorConstraints + classValidatorAdvanced + joiPatterns + zodPatterns;
  }

  private extractConstants(body: ts.Block, sf: ts.SourceFile): string[] {
    const constants: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteral(node) && node.text.length > 1) constants.push(node.text);
      if (ts.isNumericLiteral(node)) constants.push(node.text);
      ts.forEachChild(node, visit);
    };
    visit(body);
    return [...new Set(constants)].slice(0, 10);
  }

  private extractDependencies(body: ts.Block, sf: ts.SourceFile): string[] {
    const deps: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        const obj = node.expression.text;
        if (obj.startsWith("this.") === false && obj !== "console" && obj !== "Math" && obj !== "JSON") {
          deps.push(`${obj}.${node.name.text}`);
        }
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const expr = node.expression;
        if (ts.isPropertyAccessExpression(expr) && (expr.expression.kind === ts.SyntaxKind.ThisKeyword)) {
          deps.push(expr.name.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    return [...new Set(deps)].slice(0, 20);
  }

  private analyzeErrorHandling(body: ts.Block, sf: ts.SourceFile): { catchBlocks: number; caughtTypes: string[] } {
    let catchBlocks = 0;
    const caughtTypes: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isTryStatement(node) && node.catchClause) {
        catchBlocks++;
        if (node.catchClause.variableDeclaration?.type) {
          caughtTypes.push(node.catchClause.variableDeclaration.type.getText(sf));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    return { catchBlocks, caughtTypes };
  }

  private analyzeLoops(body: ts.Block): { hasStreams?: boolean; hasEnhancedFor?: boolean; streamOps?: string[] } {
    let hasStreams = false;
    let hasEnhancedFor = false;
    const streamOps: string[] = [];
    const streamMethods = ["map", "filter", "reduce", "forEach", "flatMap", "find", "some", "every", "sort"];
    const visit = (node: ts.Node) => {
      if (ts.isForOfStatement(node)) hasEnhancedFor = true;
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;
        if (streamMethods.includes(methodName)) {
          hasStreams = true;
          if (!streamOps.includes(methodName)) streamOps.push(methodName);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    return {
      hasStreams: hasStreams || undefined,
      hasEnhancedFor: hasEnhancedFor || undefined,
      streamOps: streamOps.length > 0 ? streamOps : undefined,
    };
  }

  private analyzeDataFlow(body: ts.Block, sf: ts.SourceFile): { reads: string[]; writes: string[] } {
    const reads: string[] = [];
    const writes: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        if (ts.isPropertyAccessExpression(node.left)) {
          writes.push(node.left.name.text);
        }
      }
      if (ts.isPropertyAccessExpression(node) && (node.expression.kind === ts.SyntaxKind.ThisKeyword)) {
        reads.push(node.name.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    return { reads: [...new Set(reads)], writes: [...new Set(writes)] };
  }
}
