// @docspec:module {
//   id: "docspec-go-extractor-observability",
//   name: "Observability Extractor",
//   description: "Detects Prometheus metrics, OpenTelemetry instrumentation, DataDog statsd, and health check endpoints to populate the observability section.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"strings"
)

// ObservabilityExtractor detects observability instrumentation in Go source code:
// @docspec:boundary "classpath-safe extraction"
//   - Prometheus metrics (prometheus.NewCounter, prometheus.NewHistogram, etc.)
//   - OpenTelemetry tracing (otel tracer usage)
//   - Health check endpoints (common patterns in Gin, Echo, net/http)
//   - Comment-based docspec tags (//docspec:metric, //docspec:healthcheck)
//
// This is the Go equivalent of the Java ObservabilityExtractor which detects
// Micrometer @Timed/@Counted and Spring Actuator HealthIndicator.
type ObservabilityExtractor struct{}

// Known Go observability import paths.
var observabilityImports = []string{
	"github.com/prometheus/client_golang/prometheus",
	"github.com/prometheus/client_golang/prometheus/promauto",
	"go.opentelemetry.io/otel",
	"go.opentelemetry.io/otel/trace",
	"go.opentelemetry.io/otel/metric",
	"github.com/DataDog/datadog-go/statsd",
	"github.com/armon/go-metrics",
}

// @docspec:deterministic
func (e *ObservabilityExtractor) Name() string {
	return "observability"
}

// IsAvailable reports true if any file imports a known observability package.
//
// @docspec:intentional "Checks observability library imports and docspec:metric/docspec:healthcheck tags"
func (e *ObservabilityExtractor) IsAvailable(ctx *ProcessorContext) bool {
	for _, imp := range observabilityImports {
		if hasImport(ctx, imp) {
			return true
		}
	}
	// Also check for docspec observability tags
	for _, file := range ctx.Files {
		if hasObservabilityDocTags(file) {
			return true
		}
	}
	return false
}

// Extract scans files for observability patterns and populates ctx.Observability.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Discovers Prometheus NewCounter/NewHistogram declarations, OTel meter calls, health check handlers, and docspec:metric/docspec:healthcheck tags"
func (e *ObservabilityExtractor) Extract(ctx *ProcessorContext) {
	var metrics []ObservabilityMetric
	var healthChecks []ObservabilityHealthCheck
	seen := make(map[string]bool)

	for _, file := range ctx.Files {
		imports := fileImports(file)
		pkg := file.Name.Name

		hasProm := imports["github.com/prometheus/client_golang/prometheus"] ||
			imports["github.com/prometheus/client_golang/prometheus/promauto"]
		hasOtel := imports["go.opentelemetry.io/otel/metric"]

		for _, decl := range file.Decls {
			switch d := decl.(type) {
			case *ast.GenDecl:
				// Detect global var declarations like:
				// var requestCount = prometheus.NewCounter(...)
				// var requestDuration = promauto.NewHistogram(...)
				for _, spec := range d.Specs {
					vs, ok := spec.(*ast.ValueSpec)
					if !ok || len(vs.Values) == 0 {
						continue
					}
					for i, val := range vs.Values {
						call, ok := val.(*ast.CallExpr)
						if !ok {
							continue
						}
						name, metricType := extractPrometheusMetric(call, hasProm)
						if name == "" {
							continue
						}
						if seen[name] {
							continue
						}
						seen[name] = true

						varName := ""
						if i < len(vs.Names) {
							varName = vs.Names[i].Name
						}

						m := ObservabilityMetric{
							Name:      name,
							Type:      metricType,
							EmittedBy: []string{pkg + "." + varName},
						}
						labels := extractPrometheusLabels(call)
						if len(labels) > 0 {
							m.Labels = labels
						}
						metrics = append(metrics, m)
					}
				}

			case *ast.FuncDecl:
				if !d.Name.IsExported() {
					continue
				}

				owner := pkg + "." + d.Name.Name
				if d.Recv != nil && len(d.Recv.List) > 0 {
					owner = pkg + "." + recvTypeName(d.Recv.List[0].Type) + "." + d.Name.Name
				}

				// Check docspec comment tags
				if d.Doc != nil {
					for _, c := range d.Doc.List {
						text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))

						if strings.HasPrefix(text, "docspec:metric") {
							parts := strings.Fields(text)
							if len(parts) >= 3 {
								name := parts[1]
								mtype := parts[2]
								if !seen[name] {
									seen[name] = true
									metrics = append(metrics, ObservabilityMetric{
										Name:      name,
										Type:      mtype,
										EmittedBy: []string{owner},
									})
								}
							}
						}

						if strings.HasPrefix(text, "docspec:healthcheck") {
							parts := strings.SplitN(text, " ", 2)
							path := "/health"
							if len(parts) == 2 {
								path = strings.TrimSpace(parts[1])
							}
							healthChecks = append(healthChecks, ObservabilityHealthCheck{
								Path:   path,
								Checks: []string{d.Name.Name},
							})
						}
					}
				}

				// Detect OTel meter calls inside function bodies
				if hasOtel && d.Body != nil {
					ast.Inspect(d.Body, func(n ast.Node) bool {
						call, ok := n.(*ast.CallExpr)
						if !ok {
							return true
						}
						sel, ok := call.Fun.(*ast.SelectorExpr)
						if !ok {
							return true
						}
						metricType := ""
						switch sel.Sel.Name {
						case "Int64Counter", "Float64Counter":
							metricType = "counter"
						case "Int64Histogram", "Float64Histogram":
							metricType = "histogram"
						case "Int64UpDownCounter", "Float64UpDownCounter":
							metricType = "gauge"
						}
						if metricType != "" && len(call.Args) > 0 {
							if lit, ok := call.Args[0].(*ast.BasicLit); ok {
								name := strings.Trim(lit.Value, `"`)
								if !seen[name] {
									seen[name] = true
									metrics = append(metrics, ObservabilityMetric{
										Name:      name,
										Type:      metricType,
										EmittedBy: []string{owner},
									})
								}
							}
						}
						return true
					})
				}

				// Detect health check handler patterns
				if d.Body != nil {
					if isHealthCheckFunc(d) {
						healthChecks = append(healthChecks, ObservabilityHealthCheck{
							Path:   "/health",
							Checks: []string{d.Name.Name},
						})
					}
				}
			}
		}
	}

	if len(metrics) == 0 && len(healthChecks) == 0 {
		return
	}

	if ctx.Observability == nil {
		ctx.Observability = &ObservabilityModel{}
	}
	ctx.Observability.Metrics = append(ctx.Observability.Metrics, metrics...)
	ctx.Observability.HealthChecks = append(ctx.Observability.HealthChecks, healthChecks...)
}

// extractPrometheusMetric extracts metric name and type from a prometheus.NewXxx call.
//
// @docspec:deterministic
func extractPrometheusMetric(call *ast.CallExpr, hasProm bool) (string, string) {
	if !hasProm {
		return "", ""
	}

	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return "", ""
	}

	metricType := ""
	switch sel.Sel.Name {
	case "NewCounter", "NewCounterVec":
		metricType = "counter"
	case "NewGauge", "NewGaugeVec":
		metricType = "gauge"
	case "NewHistogram", "NewHistogramVec":
		metricType = "histogram"
	case "NewSummary", "NewSummaryVec":
		metricType = "summary"
	default:
		return "", ""
	}

	// Extract name from the Opts struct literal argument
	if len(call.Args) > 0 {
		comp, ok := call.Args[0].(*ast.CompositeLit)
		if ok {
			name := extractStructField(comp, "Name")
			if name != "" {
				namespace := extractStructField(comp, "Namespace")
				subsystem := extractStructField(comp, "Subsystem")
				fullName := joinMetricName(namespace, subsystem, name)
				return fullName, metricType
			}
		}
		// Unary address might wrap the struct
		unary, ok := call.Args[0].(*ast.UnaryExpr)
		if ok {
			comp, ok := unary.X.(*ast.CompositeLit)
			if ok {
				name := extractStructField(comp, "Name")
				if name != "" {
					namespace := extractStructField(comp, "Namespace")
					subsystem := extractStructField(comp, "Subsystem")
					fullName := joinMetricName(namespace, subsystem, name)
					return fullName, metricType
				}
			}
		}
	}

	return "", ""
}

// extractPrometheusLabels extracts label names from a Vec metric call.
//
// @docspec:deterministic
func extractPrometheusLabels(call *ast.CallExpr) []string {
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return nil
	}

	// Vec metrics have a second argument with label names
	if !strings.HasSuffix(sel.Sel.Name, "Vec") || len(call.Args) < 2 {
		return nil
	}

	comp, ok := call.Args[1].(*ast.CompositeLit)
	if !ok {
		return nil
	}

	var labels []string
	for _, elt := range comp.Elts {
		if lit, ok := elt.(*ast.BasicLit); ok {
			labels = append(labels, strings.Trim(lit.Value, `"`))
		}
	}
	return labels
}

// extractStructField extracts a string literal value from a struct literal field.
//
// @docspec:deterministic
func extractStructField(comp *ast.CompositeLit, fieldName string) string {
	for _, elt := range comp.Elts {
		kv, ok := elt.(*ast.KeyValueExpr)
		if !ok {
			continue
		}
		ident, ok := kv.Key.(*ast.Ident)
		if !ok || ident.Name != fieldName {
			continue
		}
		lit, ok := kv.Value.(*ast.BasicLit)
		if !ok {
			continue
		}
		return strings.Trim(lit.Value, `"`)
	}
	return ""
}

// joinMetricName assembles a Prometheus metric name from namespace, subsystem, and name.
//
// @docspec:deterministic
func joinMetricName(namespace, subsystem, name string) string {
	parts := []string{}
	if namespace != "" {
		parts = append(parts, namespace)
	}
	if subsystem != "" {
		parts = append(parts, subsystem)
	}
	parts = append(parts, name)
	return strings.Join(parts, "_")
}

// isHealthCheckFunc checks if a function looks like a health check handler.
//
// @docspec:deterministic
func isHealthCheckFunc(fn *ast.FuncDecl) bool {
	name := strings.ToLower(fn.Name.Name)
	return strings.Contains(name, "health") || strings.Contains(name, "liveness") ||
		strings.Contains(name, "readiness") || strings.Contains(name, "ping")
}

// hasObservabilityDocTags checks for docspec observability comment tags.
//
// @docspec:deterministic
func hasObservabilityDocTags(file *ast.File) bool {
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Doc == nil {
			continue
		}
		for _, c := range fn.Doc.List {
			text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
			if strings.HasPrefix(text, "docspec:metric") || strings.HasPrefix(text, "docspec:healthcheck") {
				return true
			}
		}
	}
	return false
}
