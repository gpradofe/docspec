// @docspec:module {
//   id: "docspec-ts-privacy-extractor",
//   name: "Privacy Extractor",
//   description: "Detects PII fields via @DocPII/@DocSensitive decorators, class-validator PII decorators (@IsEmail, @IsPhoneNumber), and common PII field naming patterns (email, ssn, phone, etc.) to populate the privacy section of the DocSpec model.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
  PrivacyFieldModel,
} from "./extractor-interface.js";

/**
 * Detects privacy-sensitive data annotations and patterns in TypeScript/Node.js
 * projects and populates the privacy section of the DocSpec model.
 *
 * @docspec:boundary "AST-based PII and privacy-sensitive field detection"
 *
 * Detection targets:
 * - DocPII decorator: `@DocPII('email')`, `@DocPII({ type: 'ssn', encrypted: true })`
 * - DocSensitive decorator: `@DocSensitive()`
 * - Common PII field naming patterns: email, ssn, phone, address, password, etc.
 * - class-validator decorators: `@IsEmail()`, `@IsPhoneNumber()`
 */
export class PrivacyExtractor implements DocSpecExtractor {
  /** Common field names that indicate PII data */
  private static readonly PII_FIELD_PATTERNS: Array<{ pattern: RegExp; piiType: string }> = [
    { pattern: /^email$/i, piiType: "email" },
    { pattern: /^e?mail(Address)?$/i, piiType: "email" },
    { pattern: /^(ssn|socialSecurityNumber|social_security)$/i, piiType: "ssn" },
    { pattern: /^phone(Number)?$/i, piiType: "phone" },
    { pattern: /^(mobile|cell)(Phone|Number)?$/i, piiType: "phone" },
    { pattern: /^(address|streetAddress|homeAddress)$/i, piiType: "address" },
    { pattern: /^(zip|zipCode|postalCode)$/i, piiType: "address" },
    { pattern: /^(password|passwd|pwd)$/i, piiType: "credential" },
    { pattern: /^(secret|token|apiKey|api_key)$/i, piiType: "credential" },
    { pattern: /^(firstName|lastName|fullName|name)$/i, piiType: "name" },
    { pattern: /^(dob|dateOfBirth|birthDate|birthday)$/i, piiType: "dob" },
    { pattern: /^(creditCard|cardNumber|ccNumber)$/i, piiType: "financial" },
    { pattern: /^(iban|bankAccount|accountNumber)$/i, piiType: "financial" },
    { pattern: /^(ip|ipAddress|ip_address)$/i, piiType: "ip-address" },
  ];

  /** class-validator decorators that imply PII */
  private static readonly VALIDATOR_PII_MAP: Record<string, string> = {
    IsEmail: "email",
    IsPhoneNumber: "phone",
    IsCreditCard: "financial",
    IsPassportNumber: "identity-document",
    IsISBN: "other",
  };

  /** @docspec:deterministic */
  extractorName(): string {
    return "privacy";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for PII-related decorators and naming patterns on class properties" */
  extract(context: ExtractorContext): void {
    const fields: PrivacyFieldModel[] = [];

    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;
      this.visitNode(sourceFile, sourceFile, fields);
    }

    if (fields.length > 0) {
      context.model.privacy.push(...fields);
    }
  }

  /** @docspec:intentional "Recursively walks the AST to detect property declarations with PII indicators" */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    fields: PrivacyFieldModel[],
  ): void {
    // Check class properties for decorators and naming patterns
    if (ts.isPropertyDeclaration(node) && node.name) {
      this.analyzeProperty(node, sourceFile, fields);
    }

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, fields));
  }

  /** @docspec:intentional "Checks a property for @DocPII, @DocSensitive, class-validator PII decorators, and PII field name patterns" */
  private analyzeProperty(
    node: ts.PropertyDeclaration,
    sourceFile: ts.SourceFile,
    fields: PrivacyFieldModel[],
  ): void {
    const fieldName = node.name.getText(sourceFile);
    const ownerClass = this.findEnclosingClassName(node);
    const qualifiedField = ownerClass ? `${ownerClass}.${fieldName}` : fieldName;

    // 1. Check for @DocPII decorator
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (decorators) {
      for (const decorator of decorators) {
        if (!ts.isCallExpression(decorator.expression)) continue;
        const decoratorName = decorator.expression.expression.getText(sourceFile);

        if (decoratorName === "DocPII") {
          const pf = this.parseDocPIIDecorator(decorator.expression, sourceFile, qualifiedField);
          fields.push(pf);
          return; // Already captured, skip further checks
        }

        if (decoratorName === "DocSensitive") {
          fields.push({
            field: qualifiedField,
            piiType: "other",
            neverLog: true,
          });
          return;
        }

        // class-validator decorators
        const piiType = PrivacyExtractor.VALIDATOR_PII_MAP[decoratorName];
        if (piiType) {
          fields.push({
            field: qualifiedField,
            piiType,
          });
          return;
        }
      }
    }

    // 2. Check field naming patterns (auto-detect PII from names)
    for (const { pattern, piiType } of PrivacyExtractor.PII_FIELD_PATTERNS) {
      if (pattern.test(fieldName)) {
        // Only flag if the field is in a class that looks like a model/entity/DTO
        if (this.isLikelyDataClass(node)) {
          fields.push({
            field: qualifiedField,
            piiType,
          });
        }
        return;
      }
    }
  }

  /** @docspec:deterministic */
  private parseDocPIIDecorator(
    callExpr: ts.CallExpression,
    sourceFile: ts.SourceFile,
    qualifiedField: string,
  ): PrivacyFieldModel {
    const pf: PrivacyFieldModel = { field: qualifiedField };

    if (callExpr.arguments.length === 0) {
      pf.piiType = "other";
      return pf;
    }

    const arg = callExpr.arguments[0];

    // @DocPII('email')
    if (ts.isStringLiteral(arg)) {
      pf.piiType = arg.text;
      return pf;
    }

    // @DocPII({ type: 'email', encrypted: true, retention: '90d', ... })
    if (ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
        const key = prop.name.text;

        if (key === "type" && ts.isStringLiteral(prop.initializer)) {
          pf.piiType = prop.initializer.text;
        } else if (key === "value" && ts.isStringLiteral(prop.initializer)) {
          pf.piiType = prop.initializer.text;
        } else if (key === "retention" && ts.isStringLiteral(prop.initializer)) {
          pf.retention = prop.initializer.text;
        } else if (key === "gdprBasis" && ts.isStringLiteral(prop.initializer)) {
          pf.gdprBasis = prop.initializer.text;
        } else if (key === "encrypted") {
          pf.encrypted = prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
        } else if (key === "neverLog") {
          pf.neverLog = prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
        } else if (key === "neverReturn") {
          pf.neverReturn = prop.initializer.kind === ts.SyntaxKind.TrueKeyword;
        }
      }
    }

    if (!pf.piiType) pf.piiType = "other";
    return pf;
  }

  /**
   * Checks whether the containing class looks like a data transfer object,
   * entity, or model (to avoid false positives on controller fields, etc.).
   * @docspec:deterministic
   */
  private isLikelyDataClass(node: ts.Node): boolean {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) {
        const className = current.name.text.toLowerCase();
        return (
          className.includes("model") ||
          className.includes("entity") ||
          className.includes("dto") ||
          className.includes("user") ||
          className.includes("account") ||
          className.includes("profile") ||
          className.includes("customer") ||
          className.includes("patient") ||
          className.includes("person") ||
          className.includes("employee") ||
          className.includes("contact")
        );
      }
      current = current.parent;
    }
    return false;
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
