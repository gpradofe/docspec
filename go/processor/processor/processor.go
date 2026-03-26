// Package processor implements the DocSpec Go processor.
//
// @docspec:module {
//   id: "docspec-go-processor",
//   name: "Go Processor",
//   description: "Main orchestrator that drives the 21-step DocSpec pipeline for Go source code, coordinating scanner, framework detectors, extractors, DSTI, and serialization.",
//   since: "3.0.0"
// }
package processor

import (
	"fmt"
	"go/ast"
	"go/token"

	"github.com/docspec/docspec-processor-go/dsti"
	"github.com/docspec/docspec-processor-go/extractor"
	"github.com/docspec/docspec-processor-go/framework"
	"github.com/docspec/docspec-processor-go/metrics"
	"github.com/docspec/docspec-processor-go/output"
	"github.com/docspec/docspec-processor-go/reader"
	"github.com/docspec/docspec-processor-go/scanner"
)

// Processor processes Go source code and generates DocSpec output.
//
// @docspec:boundary "main orchestrator coordinating all pipeline stages"
// @docspec:intentional "Drives the full 21-step DocSpec pipeline: scan, detect, extract, analyze, serialize"
type Processor struct {
	SourceDir string
	OutputDir string
}

// New creates a new processor.
//
// @docspec:deterministic
func New(sourceDir, outputDir string) *Processor {
	return &Processor{SourceDir: sourceDir, OutputDir: outputDir}
}

// DocSpecOutput represents the generated docspec.json.
// @docspec:intentional "Maps 1:1 to the top-level structure of the docspec.json schema"
type DocSpecOutput struct {
	Docspec              string                   `json:"docspec"`
	Artifact             map[string]interface{}   `json:"artifact"`
	Modules              []map[string]interface{} `json:"modules"`
	IntentGraph          map[string]interface{}   `json:"intentGraph,omitempty"`
	Discovery            interface{}              `json:"discovery,omitempty"`
	Security             interface{}              `json:"security,omitempty"`
	Configuration        interface{}              `json:"configuration,omitempty"`
	Observability        interface{}              `json:"observability,omitempty"`
	DataStores           interface{}              `json:"dataStores,omitempty"`
	ExternalDependencies interface{}              `json:"externalDependencies,omitempty"`
	Privacy              interface{}              `json:"privacy,omitempty"`
	Errors               interface{}              `json:"errors,omitempty"`
	Events               interface{}              `json:"events,omitempty"`
}

// Process analyzes Go source files and produces the DocSpec output.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Executes all pipeline stages: scan -> framework detection -> module extraction -> DSTI -> domain extractors -> assembly"
func (p *Processor) Process() (*DocSpecOutput, error) {
	fset := token.NewFileSet()
	files, err := scanner.ScanDir(p.SourceDir, fset)
	if err != nil {
		return nil, fmt.Errorf("scan error: %w", err)
	}

	// Framework detection
	frameworks := []string{}
	if framework.DetectGin(p.SourceDir) {
		frameworks = append(frameworks, "gin")
	}
	if framework.DetectGorm(p.SourceDir) {
		frameworks = append(frameworks, "gorm")
	}
	if framework.DetectEcho(p.SourceDir) {
		frameworks = append(frameworks, "echo")
	}
	if framework.DetectFiber(p.SourceDir) {
		frameworks = append(frameworks, "fiber")
	}

	// Module and member extraction
	modules := make(map[string]*ModuleBuilder)
	var intentMethods []map[string]interface{}
	coverage := &metrics.CoverageCalculator{}

	for _, file := range files {
		pkg := file.Name.Name
		if _, ok := modules[pkg]; !ok {
			modules[pkg] = &ModuleBuilder{ID: pkg, Name: pkg}
		}
		mb := modules[pkg]

		for _, decl := range file.Decls {
			switch d := decl.(type) {
			case *ast.GenDecl:
				for _, spec := range d.Specs {
					if ts, ok := spec.(*ast.TypeSpec); ok {
						member := p.processTypeSpec(ts, d.Doc, pkg)
						mb.Members = append(mb.Members, member)

						// Track coverage
						desc, _ := member["description"].(string)
						coverage.AnalyzeType(metrics.TypeInfo{
							HasDescription: desc != "",
							DiscoveredFrom: "auto",
						})
						if desc != "" && reader.ReadDocComment(d.Doc) == "" {
							coverage.IncrementInferred()
						}
					}
				}
			case *ast.FuncDecl:
				if d.Name.IsExported() {
					qualified := fmt.Sprintf("%s.%s", pkg, d.Name.Name)
					if d.Recv != nil && len(d.Recv.List) > 0 {
						recvType := reader.TypeString(d.Recv.List[0].Type)
						qualified = fmt.Sprintf("%s.%s#%s", pkg, recvType, d.Name.Name)
					}

					signals := dsti.ExtractFromFunc(d)
					if signals != nil {
						intentMethods = append(intentMethods, map[string]interface{}{
							"qualified":     qualified,
							"intentSignals": signals,
						})
					}

					// Track function coverage
					funcDoc := reader.ReadDocComment(d.Doc)
					coverage.AnalyzeFunction(metrics.FunctionInfo{
						HasDescription: funcDoc != "",
					})
				}
			}
		}
	}

	// Run domain extractors
	extractorCtx := extractor.NewProcessorContext(p.SourceDir, fset, files)
	extractor.RunAll(extractorCtx, extractor.DefaultExtractors())

	// Build module list
	moduleList := make([]map[string]interface{}, 0, len(modules))
	for _, mb := range modules {
		moduleList = append(moduleList, mb.ToMap())
	}

	// Collect scanned packages
	scannedPkgs := make([]string, 0, len(modules))
	for pkg := range modules {
		scannedPkgs = append(scannedPkgs, pkg)
	}

	// Build discovery stats
	discoveryStats := coverage.ToDiscoveryStats("auto", frameworks, scannedPkgs, nil)

	out := &DocSpecOutput{
		Docspec: "3.0.0",
		Artifact: map[string]interface{}{
			"groupId":    "unknown",
			"artifactId": "unknown",
			"version":    "0.0.0",
			"language":   "go",
		},
		Modules:   moduleList,
		Discovery: discoveryStats,
	}

	if len(frameworks) > 0 {
		out.Artifact["frameworks"] = frameworks
	}

	if len(intentMethods) > 0 {
		out.IntentGraph = map[string]interface{}{
			"methods": intentMethods,
		}
	}

	// Attach extractor results (only non-empty sections)
	if extractorCtx.Security != nil {
		out.Security = extractorCtx.Security
	}
	if len(extractorCtx.Configuration) > 0 {
		out.Configuration = extractorCtx.Configuration
	}
	if extractorCtx.Observability != nil {
		out.Observability = extractorCtx.Observability
	}
	if len(extractorCtx.DataStores) > 0 {
		out.DataStores = extractorCtx.DataStores
	}
	if len(extractorCtx.ExternalDeps) > 0 {
		out.ExternalDependencies = extractorCtx.ExternalDeps
	}
	if len(extractorCtx.Privacy) > 0 {
		out.Privacy = extractorCtx.Privacy
	}
	if len(extractorCtx.Errors) > 0 {
		out.Errors = extractorCtx.Errors
	}
	if len(extractorCtx.Events) > 0 {
		out.Events = extractorCtx.Events
	}

	return out, nil
}

// Write serializes the output to docspec.json.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Delegates to output.WriteJSON to persist the assembled DocSpec model"
func (p *Processor) Write(spec *DocSpecOutput) error {
	return output.WriteJSON(spec, p.OutputDir, "docspec.json")
}

// @docspec:intentional "Extracts type name, description, kind, and fields from a Go type specification"
func (p *Processor) processTypeSpec(ts *ast.TypeSpec, doc *ast.CommentGroup, pkg string) map[string]interface{} {
	name := ts.Name.Name
	qualified := fmt.Sprintf("%s.%s", pkg, name)
	description := reader.ReadDocComment(doc)
	if description == "" {
		description = reader.InferDescription(name)
	}

	kind := "class"
	switch ts.Type.(type) {
	case *ast.StructType:
		kind = "struct"
	case *ast.InterfaceType:
		kind = "interface"
	}

	member := map[string]interface{}{
		"kind":        kind,
		"name":        name,
		"qualified":   qualified,
		"description": description,
	}

	if st, ok := ts.Type.(*ast.StructType); ok && st.Fields != nil {
		fields := make([]map[string]string, 0)
		for _, f := range st.Fields.List {
			if len(f.Names) > 0 && f.Names[0].IsExported() {
				fields = append(fields, map[string]string{
					"name": f.Names[0].Name,
					"type": reader.TypeString(f.Type),
				})
			}
		}
		if len(fields) > 0 {
			member["fields"] = fields
		}
	}

	return member
}

// ModuleBuilder collects members for a module.
// @docspec:intentional "Accumulates type and function members discovered in a single Go package"
type ModuleBuilder struct {
	ID      string
	Name    string
	Members []map[string]interface{}
}

// ToMap converts to a JSON-serializable map.
//
// @docspec:deterministic
func (mb *ModuleBuilder) ToMap() map[string]interface{} {
	return map[string]interface{}{
		"id":      mb.ID,
		"name":    mb.Name,
		"members": mb.Members,
	}
}
