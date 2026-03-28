// @docspec:module {
//   id: "docspec-ts-error-event-extractor",
//   name: "Error & Event Extractor",
//   description: "Detects throw statements (including NestJS HTTP exceptions), custom Error class definitions, EventEmitter/RxJS/NestJS event emission, and event subscriptions to populate the errors and events sections of the DocSpec model.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
  ErrorModel,
  EventModel,
} from "./extractor-interface.js";

/**
 * Detects error throwing patterns and event emission patterns in TypeScript/Node.js
 * projects and populates the errors and events sections of the DocSpec model.
 *
 * @docspec:boundary "AST-based error and event pattern detection for Node.js, NestJS, and RxJS"
 *
 * Error detection targets:
 * - `throw new Error(...)`, `throw new CustomError(...)`
 * - NestJS HTTP exceptions: `throw new HttpException(...)`, `throw new NotFoundException(...)`
 * - Custom error classes extending Error
 *
 * Event detection targets:
 * - EventEmitter: `this.emit('event')`, `emitter.emit('event')`
 * - RxJS: `subject.next(...)`, `observable.pipe(...)`
 * - NestJS EventEmitter2: `eventEmitter.emit('event', payload)`
 * - DOM / Node events: `addEventListener('event')`, `on('event')`
 */
export class ErrorEventExtractor implements DocSpecExtractor {
  /** Known NestJS HTTP exception class names */
  private static readonly NESTJS_EXCEPTIONS = [
    "HttpException", "BadRequestException", "UnauthorizedException",
    "NotFoundException", "ForbiddenException", "NotAcceptableException",
    "RequestTimeoutException", "ConflictException", "GoneException",
    "PayloadTooLargeException", "UnsupportedMediaTypeException",
    "UnprocessableEntityException", "InternalServerErrorException",
    "NotImplementedException", "BadGatewayException",
    "ServiceUnavailableException", "GatewayTimeoutException",
  ];

  /** Event emission method names */
  private static readonly EMIT_METHODS = ["emit", "next", "dispatch"];

  /** Event subscription method names */
  private static readonly SUBSCRIBE_METHODS = [
    "on", "once", "addEventListener", "addListener", "subscribe",
    "onEvent", "handle",
  ];

  /** @docspec:deterministic */
  extractorName(): string {
    return "error-event";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for throw statements, custom Error classes, and event emission/subscription patterns" */
  extract(context: ExtractorContext): void {
    const errorMap = new Map<string, ErrorModel>();
    const eventEmitMap = new Map<string, Set<string>>();
    const eventConsumeMap = new Map<string, Set<string>>();

    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;
      this.visitNode(sourceFile, sourceFile, errorMap, eventEmitMap, eventConsumeMap);
    }

    // Merge errors
    if (errorMap.size > 0) {
      for (const error of errorMap.values()) {
        context.model.errors.push(error);
      }
    }

    // Merge events
    const allEventNames = new Set([...eventEmitMap.keys(), ...eventConsumeMap.keys()]);
    for (const eventName of allEventNames) {
      const event: EventModel = {
        name: eventName,
        emittedBy: [...(eventEmitMap.get(eventName) ?? [])],
        consumedBy: [...(eventConsumeMap.get(eventName) ?? [])],
      };
      context.model.events.push(event);
    }
  }

  /** @docspec:intentional "Recursively walks the AST to detect throw statements, error class definitions, event emissions, and event subscriptions" */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    errorMap: Map<string, ErrorModel>,
    eventEmitMap: Map<string, Set<string>>,
    eventConsumeMap: Map<string, Set<string>>,
  ): void {
    // Detect throw statements
    if (ts.isThrowStatement(node)) {
      this.analyzeThrowStatement(node, sourceFile, errorMap);
    }

    // Detect custom Error class definitions
    if (ts.isClassDeclaration(node)) {
      this.analyzeErrorClass(node, sourceFile, errorMap);
    }

    // Detect event emission and subscription
    if (ts.isCallExpression(node)) {
      this.analyzeEventCall(node, sourceFile, eventEmitMap, eventConsumeMap);
    }

    // Detect NestJS event decorators
    if (ts.isMethodDeclaration(node)) {
      this.analyzeEventDecorators(node, sourceFile, eventConsumeMap);
    }

    ts.forEachChild(node, child =>
      this.visitNode(child, sourceFile, errorMap, eventEmitMap, eventConsumeMap),
    );
  }

  /** @docspec:intentional "Extracts error type, message, and owning method from throw statements including NestJS HTTP exceptions" */
  private analyzeThrowStatement(
    node: ts.ThrowStatement,
    sourceFile: ts.SourceFile,
    errorMap: Map<string, ErrorModel>,
  ): void {
    if (!node.expression) return;

    let errorType = "Error";
    let message: string | undefined;

    if (ts.isNewExpression(node.expression)) {
      errorType = node.expression.expression.getText(sourceFile);

      // Extract message from first argument
      if (node.expression.arguments && node.expression.arguments.length > 0) {
        const firstArg = node.expression.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          message = firstArg.text;
        } else if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
          message = firstArg.text;
        } else if (ts.isTemplateExpression(firstArg)) {
          message = firstArg.head.text + "...";
        }
      }
    } else if (ts.isIdentifier(node.expression)) {
      errorType = node.expression.text;
    }

    const owner = this.findEnclosingName(node, sourceFile);
    const key = errorType;

    if (!errorMap.has(key)) {
      errorMap.set(key, {
        type: errorType,
        message,
        thrownBy: owner ? [owner] : [],
      });
    } else {
      const existing = errorMap.get(key)!;
      if (owner && !existing.thrownBy.includes(owner)) {
        existing.thrownBy.push(owner);
      }
      // Update message if we have a more specific one
      if (message && !existing.message) {
        existing.message = message;
      }
    }
  }

  /** @docspec:intentional "Detects custom Error subclass declarations and registers them in the error catalog" */
  private analyzeErrorClass(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    errorMap: Map<string, ErrorModel>,
  ): void {
    if (!node.name || !node.heritageClauses) return;

    for (const clause of node.heritageClauses) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
      for (const type of clause.types) {
        const parentName = type.expression.getText(sourceFile);
        if (parentName === "Error" || parentName.endsWith("Error") || parentName.endsWith("Exception")) {
          const className = node.name!.text;
          if (!errorMap.has(className)) {
            errorMap.set(className, {
              type: className,
              thrownBy: [],
            });
          }
        }
      }
    }
  }

  /** @docspec:intentional "Detects event emit/dispatch/next calls and on/subscribe/addEventListener registrations" */
  private analyzeEventCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    eventEmitMap: Map<string, Set<string>>,
    eventConsumeMap: Map<string, Set<string>>,
  ): void {
    if (!ts.isPropertyAccessExpression(node.expression)) return;

    const methodName = node.expression.name.text;
    const owner = this.findEnclosingName(node, sourceFile);

    // Event emission: this.emit('eventName', ...) or emitter.emit('eventName')
    if (ErrorEventExtractor.EMIT_METHODS.includes(methodName)) {
      if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
        const eventName = node.arguments[0].text;
        if (!eventEmitMap.has(eventName)) eventEmitMap.set(eventName, new Set());
        if (owner) eventEmitMap.get(eventName)!.add(owner);
      }
    }

    // Event subscription: emitter.on('eventName', handler)
    if (ErrorEventExtractor.SUBSCRIBE_METHODS.includes(methodName)) {
      if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
        const eventName = node.arguments[0].text;
        if (!eventConsumeMap.has(eventName)) eventConsumeMap.set(eventName, new Set());
        if (owner) eventConsumeMap.get(eventName)!.add(owner);
      }
    }
  }

  /** @docspec:intentional "Detects @OnEvent and @EventPattern NestJS decorators to register event consumers" */
  private analyzeEventDecorators(
    node: ts.MethodDeclaration,
    sourceFile: ts.SourceFile,
    eventConsumeMap: Map<string, Set<string>>,
  ): void {
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return;

    for (const decorator of decorators) {
      if (!ts.isCallExpression(decorator.expression)) continue;
      const name = decorator.expression.expression.getText(sourceFile);

      // @OnEvent('eventName'), @EventPattern('eventName')
      if (name === "OnEvent" || name === "EventPattern") {
        if (decorator.expression.arguments.length > 0 && ts.isStringLiteral(decorator.expression.arguments[0])) {
          const eventName = decorator.expression.arguments[0].text;
          const owner = this.findEnclosingName(node, sourceFile);
          if (!eventConsumeMap.has(eventName)) eventConsumeMap.set(eventName, new Set());
          if (owner) eventConsumeMap.get(eventName)!.add(owner);
        }
      }
    }
  }

  /** @docspec:deterministic */
  private findEnclosingName(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) return current.name.text;
      if (ts.isMethodDeclaration(current) && current.name) {
        // Return Class.method if we can find the class
        const className = this.findEnclosingClassName(current);
        const methodText = current.name.getText(sourceFile);
        return className ? `${className}.${methodText}` : methodText;
      }
      if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
      current = current.parent;
    }
    return null;
  }

  /** @docspec:deterministic */
  private findEnclosingClassName(node: ts.Node): string | null {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) return current.name.text;
      current = current.parent;
    }
    return null;
  }
}
