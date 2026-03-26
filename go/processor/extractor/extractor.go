// Package extractor provides domain-specific extractors that analyze Go source
// code and populate the DocSpec model with security, configuration, observability,
// data store, external dependency, privacy, and error/event information.
//
// @docspec:module {
//   id: "docspec-go-extractor",
//   name: "Domain Extractors",
//   description: "Seven classpath-safe extractors that populate the v3 documentation domains: security, configuration, observability, data stores, external dependencies, privacy, and errors/events.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"go/token"
)

// ProcessorContext carries all the state that extractors need: parsed AST files,
// the file set for position info, the source directory for go.mod inspection,
// and the accumulated output maps that form the docspec.json sections.
//
// @docspec:intentional "Central accumulator for all domain extractor outputs, shared across the pipeline"
type ProcessorContext struct {
	// SourceDir is the root directory being processed.
	SourceDir string

	// Fset is the token file set used during parsing.
	Fset *token.FileSet

	// Files are all the parsed Go source files.
	Files []*ast.File

	// Security accumulates the security model section.
	Security *SecurityModel

	// Configuration accumulates configuration properties.
	Configuration []ConfigProperty

	// Observability accumulates the observability model section.
	Observability *ObservabilityModel

	// DataStores accumulates discovered data stores.
	DataStores []DataStore

	// ExternalDeps accumulates external dependency entries.
	ExternalDeps []ExternalDependency

	// Privacy accumulates privacy-sensitive field entries.
	Privacy []PrivacyField

	// Errors accumulates documented error entries.
	Errors []ErrorEntry

	// Events accumulates documented event entries.
	Events []EventEntry
}

// NewProcessorContext creates a ProcessorContext with initialized slices.
//
// @docspec:intentional "Initializes all accumulator slices to prevent nil panics during extraction"
func NewProcessorContext(sourceDir string, fset *token.FileSet, files []*ast.File) *ProcessorContext {
	return &ProcessorContext{
		SourceDir:     sourceDir,
		Fset:          fset,
		Files:         files,
		Security:      nil,
		Configuration: []ConfigProperty{},
		DataStores:    []DataStore{},
		ExternalDeps:  []ExternalDependency{},
		Privacy:       []PrivacyField{},
		Errors:        []ErrorEntry{},
		Events:        []EventEntry{},
	}
}

// DocSpecExtractor is the interface that all domain extractors implement.
// IsAvailable checks whether the extractor can operate (e.g. required imports
// are present in the scanned files). Extract performs the actual analysis.
//
// @docspec:boundary "classpath-safe extraction"
// @docspec:intentional "Defines the contract for all domain extractors: availability check followed by extraction"
type DocSpecExtractor interface {
	// Name returns a human-readable name for diagnostic messages.
	Name() string

	// IsAvailable reports whether this extractor can operate on the given context.
	// Typically checks for the presence of specific imports in the source files.
	IsAvailable(ctx *ProcessorContext) bool

	// Extract analyzes the source files and populates the context with extracted data.
	Extract(ctx *ProcessorContext)
}

// RunAll executes every extractor in order, skipping those that are not available.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Runs all extractors in sequence, skipping unavailable ones for classpath safety"
func RunAll(ctx *ProcessorContext, extractors []DocSpecExtractor) {
	for _, ext := range extractors {
		if ext.IsAvailable(ctx) {
			ext.Extract(ctx)
		}
	}
}

// DefaultExtractors returns the standard set of extractors in recommended order.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func DefaultExtractors() []DocSpecExtractor {
	return []DocSpecExtractor{
		&SecurityExtractor{},
		&ConfigExtractor{},
		&ObservabilityExtractor{},
		&DataStoreExtractor{},
		&ExternalDepExtractor{},
		&PrivacyExtractor{},
		&ErrorEventExtractor{},
	}
}

// --- Shared model types used by extractors ---

// SecurityModel represents the security section of the DocSpec output.
type SecurityModel struct {
	Roles     []string               `json:"roles,omitempty"`
	Endpoints []SecurityEndpointRule `json:"endpoints,omitempty"`
}

// SecurityEndpointRule represents a security rule for an endpoint.
type SecurityEndpointRule struct {
	Path   string   `json:"path"`
	Rules  []string `json:"rules,omitempty"`
	Public bool     `json:"public"`
}

// ConfigProperty represents a configuration property.
type ConfigProperty struct {
	Key          string   `json:"key"`
	Type         string   `json:"type,omitempty"`
	DefaultValue string   `json:"defaultValue,omitempty"`
	Source       string   `json:"source,omitempty"`
	UsedBy       []string `json:"usedBy,omitempty"`
}

// ObservabilityModel represents the observability section.
type ObservabilityModel struct {
	Metrics      []ObservabilityMetric      `json:"metrics,omitempty"`
	HealthChecks []ObservabilityHealthCheck `json:"healthChecks,omitempty"`
}

// ObservabilityMetric represents a single metric.
type ObservabilityMetric struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Labels    []string `json:"labels,omitempty"`
	EmittedBy []string `json:"emittedBy,omitempty"`
}

// ObservabilityHealthCheck represents a health check endpoint.
type ObservabilityHealthCheck struct {
	Path   string   `json:"path"`
	Checks []string `json:"checks,omitempty"`
}

// DataStore represents a data store (database, cache, message broker).
type DataStore struct {
	ID     string          `json:"id"`
	Name   string          `json:"name"`
	Type   string          `json:"type"`
	Tables []string        `json:"tables,omitempty"`
	Topics []DataStoreTopic `json:"topics,omitempty"`
}

// DataStoreTopic represents a message broker topic.
type DataStoreTopic struct {
	Name string `json:"name"`
}

// ExternalDependency represents an external service or API.
type ExternalDependency struct {
	Name      string                      `json:"name"`
	BaseURL   string                      `json:"baseUrl,omitempty"`
	Endpoints []ExternalDependencyEndpoint `json:"endpoints,omitempty"`
}

// ExternalDependencyEndpoint represents an endpoint on an external dependency.
type ExternalDependencyEndpoint struct {
	Method string   `json:"method"`
	Path   string   `json:"path"`
	UsedBy []string `json:"usedBy,omitempty"`
}

// PrivacyField represents a privacy-sensitive field.
type PrivacyField struct {
	Field       string `json:"field"`
	PIIType     string `json:"piiType,omitempty"`
	Retention   string `json:"retention,omitempty"`
	GDPRBasis   string `json:"gdprBasis,omitempty"`
	Encrypted   bool   `json:"encrypted,omitempty"`
	NeverLog    bool   `json:"neverLog,omitempty"`
	NeverReturn bool   `json:"neverReturn,omitempty"`
}

// ErrorEntry represents a documented error code.
type ErrorEntry struct {
	Code        string   `json:"code"`
	HTTPStatus  int      `json:"httpStatus,omitempty"`
	Exception   string   `json:"exception,omitempty"`
	Description string   `json:"description,omitempty"`
	Causes      []string `json:"causes,omitempty"`
	Resolution  string   `json:"resolution,omitempty"`
	ThrownBy    []string `json:"thrownBy,omitempty"`
}

// EventEntry represents a documented event.
type EventEntry struct {
	Name              string `json:"name"`
	Description       string `json:"description,omitempty"`
	Trigger           string `json:"trigger,omitempty"`
	Channel           string `json:"channel,omitempty"`
	DeliveryGuarantee string `json:"deliveryGuarantee,omitempty"`
}

// --- Shared helpers for import detection ---

// hasImport checks whether any file in the context imports the given path.
//
// @docspec:deterministic
func hasImport(ctx *ProcessorContext, importPath string) bool {
	for _, file := range ctx.Files {
		for _, imp := range file.Imports {
			path := imp.Path.Value
			// Strip quotes
			if len(path) >= 2 {
				path = path[1 : len(path)-1]
			}
			if path == importPath {
				return true
			}
		}
	}
	return false
}

// fileImports returns the set of import paths for a single file.
//
// @docspec:deterministic
func fileImports(file *ast.File) map[string]bool {
	imports := make(map[string]bool)
	for _, imp := range file.Imports {
		path := imp.Path.Value
		if len(path) >= 2 {
			path = path[1 : len(path)-1]
		}
		imports[path] = true
	}
	return imports
}
