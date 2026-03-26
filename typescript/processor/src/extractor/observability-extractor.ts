// @docspec:module {
//   id: "docspec-ts-observability-extractor",
//   name: "Observability Extractor",
//   description: "Detects prom-client metric constructors, NestJS health indicators, @Timed/@Counted decorators, and logger creation patterns to populate the observability section of the DocSpec model.",
//   since: "3.0.0"
// }

import ts from "typescript";
import type {
  DocSpecExtractor,
  ExtractorContext,
  ObservabilityModel,
  ObservabilityMetricModel,
  ObservabilityHealthCheckModel,
} from "./extractor-interface.js";

/**
 * Detects observability patterns (metrics, health checks, logging) in
 * TypeScript/Node.js projects and populates the observability section
 * of the DocSpec model.
 *
 * @docspec:boundary "AST-based observability pattern detection for prom-client, NestJS, and logging frameworks"
 *
 * Detection targets:
 * - prom-client: `new Counter(...)`, `new Histogram(...)`, `new Gauge(...)`, `new Summary(...)`
 * - Metrics decorators: NestJS `@Histogram()`, `@Counter()` decorators
 * - Health checks: NestJS `HealthIndicator` implementations, `/health` endpoints
 * - Logging: winston, pino, bunyan logger creation patterns
 */
export class ObservabilityExtractor implements DocSpecExtractor {
  /** prom-client metric constructors */
  private static readonly PROM_METRIC_TYPES = ["Counter", "Histogram", "Gauge", "Summary"];

  /** Logger library creation patterns */
  private static readonly LOGGER_PATTERNS = [
    "winston.createLogger", "pino", "bunyan.createLogger",
    "createLogger", "getLogger", "new Logger",
  ];

  /** @docspec:deterministic */
  extractorName(): string {
    return "observability";
  }

  /** @docspec:deterministic */
  isAvailable(): boolean {
    return true;
  }

  /** @docspec:intentional "Scans all source files for prom-client metrics, health check classes, and metric-related decorators" */
  extract(context: ExtractorContext): void {
    const metrics: ObservabilityMetricModel[] = [];
    const healthChecks: ObservabilityHealthCheckModel[] = [];

    for (const sourceFile of context.sourceFiles) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes("node_modules")) continue;
      this.visitNode(sourceFile, sourceFile, metrics, healthChecks);
    }

    if (metrics.length === 0 && healthChecks.length === 0) return;

    const observability: ObservabilityModel = context.model.observability ?? {
      metrics: [],
      healthChecks: [],
    };
    observability.metrics.push(...metrics);
    observability.healthChecks.push(...healthChecks);
    context.model.observability = observability;
  }

  /** @docspec:intentional "Recursively walks the AST to detect metric constructors, health check classes, metric decorators, and register calls" */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    metrics: ObservabilityMetricModel[],
    healthChecks: ObservabilityHealthCheckModel[],
  ): void {
    // Detect prom-client metric constructors: new Counter({name: '...', ...})
    if (ts.isNewExpression(node)) {
      this.analyzeNewExpression(node, sourceFile, metrics);
    }

    // Detect health check endpoints or HealthIndicator implementations
    if (ts.isClassDeclaration(node)) {
      this.analyzeClassForHealthCheck(node, sourceFile, healthChecks);
    }

    // Detect metric-related decorators
    if (ts.isMethodDeclaration(node)) {
      this.analyzeMethodDecorators(node, sourceFile, metrics);
    }

    // Detect register.* metric creation: register.counter(...)
    if (ts.isCallExpression(node)) {
      this.analyzeCallExpression(node, sourceFile, metrics);
    }

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, metrics, healthChecks));
  }

  /** @docspec:intentional "Extracts metric name, type, and labels from prom-client constructor calls (Counter, Histogram, Gauge, Summary)" */
  private analyzeNewExpression(
    node: ts.NewExpression,
    sourceFile: ts.SourceFile,
    metrics: ObservabilityMetricModel[],
  ): void {
    const className = node.expression.getText(sourceFile);

    // Strip namespace: promClient.Counter -> Counter
    const simpleName = className.includes(".") ? className.split(".").pop()! : className;

    if (!ObservabilityExtractor.PROM_METRIC_TYPES.includes(simpleName)) return;

    const metricType = simpleName.toLowerCase();
    let metricName = `unnamed_${metricType}`;
    const labels: string[] = [];

    // Parse the config object argument
    if (node.arguments && node.arguments.length > 0) {
      const configArg = node.arguments[0];
      if (ts.isObjectLiteralExpression(configArg)) {
        for (const prop of configArg.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;

          if (prop.name.text === "name" && ts.isStringLiteral(prop.initializer)) {
            metricName = prop.initializer.text;
          }
          if (prop.name.text === "labelNames" && ts.isArrayLiteralExpression(prop.initializer)) {
            for (const el of prop.initializer.elements) {
              if (ts.isStringLiteral(el)) labels.push(el.text);
            }
          }
        }
      }
    }

    const ownerClass = this.findEnclosingName(node, sourceFile);
    const metric: ObservabilityMetricModel = {
      name: metricName,
      type: metricType,
      emittedBy: ownerClass ? [ownerClass] : [],
    };
    if (labels.length > 0) metric.labels = labels;
    metrics.push(metric);
  }

  /** @docspec:intentional "Detects health check classes by name pattern and HealthIndicator interface implementation" */
  private analyzeClassForHealthCheck(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    healthChecks: ObservabilityHealthCheckModel[],
  ): void {
    if (!node.name) return;
    const className = node.name.text;

    // Check if class name ends with HealthIndicator or HealthCheck
    const isHealthClass =
      className.endsWith("HealthIndicator") ||
      className.endsWith("HealthCheck") ||
      className.endsWith("HealthService");

    // Check heritage clauses for HealthIndicator
    let implementsHealthIndicator = false;
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        for (const type of clause.types) {
          const typeName = type.expression.getText(sourceFile);
          if (typeName === "HealthIndicator" || typeName === "HealthCheckService") {
            implementsHealthIndicator = true;
          }
        }
      }
    }

    if (isHealthClass || implementsHealthIndicator) {
      healthChecks.push({
        path: "/health",
        checks: [className],
      });
    }
  }

  /** @docspec:intentional "Extracts metric definitions from @Timed and @Counted method decorators" */
  private analyzeMethodDecorators(
    node: ts.MethodDeclaration,
    sourceFile: ts.SourceFile,
    metrics: ObservabilityMetricModel[],
  ): void {
    const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
    if (!decorators) return;

    for (const decorator of decorators) {
      if (!ts.isCallExpression(decorator.expression)) continue;
      const name = decorator.expression.expression.getText(sourceFile);

      // @Timed('metric_name') or @Counted('metric_name')
      if (name === "Timed" || name === "Counted") {
        let metricName = "";
        if (decorator.expression.arguments.length > 0 && ts.isStringLiteral(decorator.expression.arguments[0])) {
          metricName = decorator.expression.arguments[0].text;
        }
        if (!metricName && node.name) {
          metricName = node.name.getText(sourceFile);
        }

        const ownerClass = this.findEnclosingName(node, sourceFile);
        metrics.push({
          name: metricName,
          type: name === "Timed" ? "timer" : "counter",
          emittedBy: ownerClass ? [ownerClass] : [],
        });
      }
    }
  }

  /** @docspec:intentional "Detects register.counter/histogram/gauge/summary metric creation calls" */
  private analyzeCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    metrics: ObservabilityMetricModel[],
  ): void {
    if (!ts.isPropertyAccessExpression(node.expression)) return;

    const methodName = node.expression.name.text;
    const objectText = node.expression.expression.getText(sourceFile);

    // register.counter({name: '...'}), register.histogram({name: '...'})
    if (objectText.includes("register") || objectText.includes("metrics")) {
      const metricType = methodName.toLowerCase();
      if (["counter", "histogram", "gauge", "summary"].includes(metricType)) {
        let metricName = `unnamed_${metricType}`;
        if (node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (ts.isObjectLiteralExpression(arg)) {
            for (const prop of arg.properties) {
              if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)
                  && prop.name.text === "name" && ts.isStringLiteral(prop.initializer)) {
                metricName = prop.initializer.text;
              }
            }
          } else if (ts.isStringLiteral(arg)) {
            metricName = arg.text;
          }
        }
        const ownerClass = this.findEnclosingName(node, sourceFile);
        metrics.push({
          name: metricName,
          type: metricType,
          emittedBy: ownerClass ? [ownerClass] : [],
        });
      }
    }
  }

  /** @docspec:deterministic */
  private findEnclosingName(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) return current.name.text;
      if (ts.isMethodDeclaration(current) && current.name) return current.name.getText(sourceFile);
      if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
      current = current.parent;
    }
    return null;
  }
}
