// Package docspec provides metadata types for DocSpec documentation.
// Go does not have decorators, so DocSpec metadata is expressed via
// struct tags and specially formatted doc comments.
//
// Struct tags: `docspec:"module=auth,audience=public"`
// Doc comments: //docspec:method name=GetUser,description=Retrieves a user
//
// @docspec:module {
//   id: "docspec-go-annotations-core",
//   name: "Go Annotations (Core)",
//   description: "Core metadata types for DocSpec Go annotations: module, method, flow, step, error, event, PII, invariant, monotonic, and performance. These structs express annotation semantics that Go lacks as a language feature.",
//   since: "3.0.0"
// }
package docspec

// ModuleMeta holds DocSpec module metadata.
// Go equivalent of Java @DocModule.
//
// @docspec:intentional "Represents the @DocModule annotation as a Go struct with JSON serialization tags"
type ModuleMeta struct {
	ID          string `json:"id"`
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
	Since       string `json:"since,omitempty"`
	Audience    string `json:"audience,omitempty"`
}

// MethodMeta holds DocSpec method metadata.
// Go equivalent of Java @DocMethod (Tags field from @DocTags).
//
// @docspec:intentional "Represents the @DocMethod annotation with optional deprecation and tagging"
type MethodMeta struct {
	Name        string   `json:"name,omitempty"`
	Description string   `json:"description,omitempty"`
	Since       string   `json:"since,omitempty"`
	Deprecated  string   `json:"deprecated,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

// FlowMeta holds DocSpec flow metadata.
// Go equivalent of Java @DocFlow.
//
// @docspec:intentional "Represents the @DocFlow annotation capturing multi-step business process documentation"
type FlowMeta struct {
	ID          string     `json:"id"`
	Name        string     `json:"name,omitempty"`
	Description string     `json:"description,omitempty"`
	Trigger     string     `json:"trigger,omitempty"`
	Steps       []StepMeta `json:"steps,omitempty"`
}

// StepMeta holds DocSpec flow step metadata.
// Go equivalent of Java @Step.
type StepMeta struct {
	ID             string   `json:"id"`
	Name           string   `json:"name,omitempty"`
	Actor          string   `json:"actor,omitempty"`
	ActorQualified string   `json:"actorQualified,omitempty"`
	Description    string   `json:"description,omitempty"`
	Type           string   `json:"type,omitempty"`
	AI             bool     `json:"ai,omitempty"`
	RetryTarget    string   `json:"retryTarget,omitempty"`
	Inputs         []string `json:"inputs,omitempty"`
	Outputs        []string `json:"outputs,omitempty"`
}

// ErrorMeta holds DocSpec error metadata.
// Go equivalent of Java @DocError.
type ErrorMeta struct {
	Code        string   `json:"code"`
	HTTPStatus  int      `json:"httpStatus,omitempty"`
	Description string   `json:"description,omitempty"`
	Causes      []string `json:"causes,omitempty"`
	Resolution  string   `json:"resolution,omitempty"`
	Since       string   `json:"since,omitempty"`
}

// EventMeta holds DocSpec event metadata.
// Go equivalent of Java @DocEvent.
type EventMeta struct {
	Name              string `json:"name"`
	Description       string `json:"description,omitempty"`
	Trigger           string `json:"trigger,omitempty"`
	Channel           string `json:"channel,omitempty"`
	DeliveryGuarantee string `json:"deliveryGuarantee,omitempty"`
	RetryPolicy       string `json:"retryPolicy,omitempty"`
	Since             string `json:"since,omitempty"`
}

// PIIMeta holds DocSpec PII metadata.
// Go equivalent of Java @DocPII.
type PIIMeta struct {
	Type        string `json:"type"`
	Retention   string `json:"retention,omitempty"`
	GDPRBasis   string `json:"gdprBasis,omitempty"`
	Encrypted   bool   `json:"encrypted,omitempty"`
	NeverLog    bool   `json:"neverLog,omitempty"`
	NeverReturn bool   `json:"neverReturn,omitempty"`
}

// InvariantMeta holds DocSpec invariant rule metadata.
// Go equivalent of Java @DocInvariant.
//
// @docspec:intentional "Captures invariant rules that must hold before and after method execution"
type InvariantMeta struct {
	On          string   `json:"on,omitempty"`
	Rules       []string `json:"rules"`
	Description string   `json:"description,omitempty"`
}

// MonotonicMeta holds DocSpec monotonic property metadata.
// Go equivalent of Java @DocMonotonic.
type MonotonicMeta struct {
	Field       string `json:"field"`
	Direction   string `json:"direction"`
	Description string `json:"description,omitempty"`
}

// PerformanceMeta holds DocSpec performance metadata.
// Go equivalent of Java @DocPerformance.
type PerformanceMeta struct {
	ExpectedLatency string `json:"expectedLatency,omitempty"`
	Bottleneck      string `json:"bottleneck,omitempty"`
}
