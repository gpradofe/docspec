// Package docspec provides metadata types for DocSpec documentation.
// This file contains extended types to achieve 42/42 parity with the
// Java annotation set. Types defined here complement docspec.go which
// contains the original core types (ModuleMeta, MethodMeta, FlowMeta,
// StepMeta, ErrorMeta, EventMeta, PIIMeta, InvariantMeta, MonotonicMeta,
// PerformanceMeta).
//
// @docspec:module {
//   id: "docspec-go-annotations-extended",
//   name: "Go Annotations (Extended)",
//   description: "Extended metadata types completing 42/42 parity with Java annotations: protocol types (AsyncAPI, gRPC, GraphQL, WebSocket, Command), cross-references, DSTI semantics, quality, and documentation metadata.",
//   since: "3.0.0"
// }
package docspec

// ---------------------------------------------------------------------------
// Nested / helper types (Java: @ContextInput, @ContextUses)
// ---------------------------------------------------------------------------

// ContextInputMeta describes a single runtime input within a ContextMeta.
// Go equivalent of Java @ContextInput.
type ContextInputMeta struct {
	Name        string   `json:"name"`
	Source      string   `json:"source,omitempty"`
	Description string   `json:"description,omitempty"`
	Items       []string `json:"items,omitempty"`
}

// ContextUsesMeta declares a cross-project usage link within a ContextMeta.
// Go equivalent of Java @ContextUses.
type ContextUsesMeta struct {
	Artifact string `json:"artifact"`
	What     string `json:"what"`
	Why      string `json:"why,omitempty"`
}

// ---------------------------------------------------------------------------
// Protocol types (Java: @DocAsyncAPI, @DocGRPC, @DocGraphQL, @DocWebSocket,
//                       @DocCommand)
// ---------------------------------------------------------------------------

// AsyncAPIMeta marks a type that implements an AsyncAPI specification.
// Go equivalent of Java @DocAsyncAPI.
//
//	//docspec:asyncapi channel="orders/created" operation="subscribe"
type AsyncAPIMeta struct {
	Channel   string `json:"channel"`
	Operation string `json:"operation,omitempty"`
}

// GRPCMeta marks a gRPC service or method.
// Go equivalent of Java @DocGRPC.
//
//	//docspec:grpc service="PaymentService" method="ProcessPayment"
type GRPCMeta struct {
	Service string `json:"service,omitempty"`
	Method  string `json:"method,omitempty"`
}

// GraphQLMeta marks a GraphQL resolver or type.
// Go equivalent of Java @DocGraphQL.
//
//	//docspec:graphql type="Query" field="user"
type GraphQLMeta struct {
	Type  string `json:"type,omitempty"`
	Field string `json:"field,omitempty"`
}

// WebSocketMeta marks a WebSocket endpoint.
// Go equivalent of Java @DocWebSocket.
//
//	//docspec:websocket path="/ws/notifications" messages="Subscribe,Unsubscribe"
type WebSocketMeta struct {
	Path     string   `json:"path,omitempty"`
	Messages []string `json:"messages,omitempty"`
}

// CommandMeta documents a command in a CQRS architecture.
// Go equivalent of Java @DocCommand.
//
//	//docspec:command value="PlaceOrder" aggregate="Order"
type CommandMeta struct {
	Value     string `json:"value"`
	Aggregate string `json:"aggregate,omitempty"`
}

// ---------------------------------------------------------------------------
// Cross-reference types (Java: @DocUses, @DocUsesAll, @DocSpecExample)
// ---------------------------------------------------------------------------

// UsesMeta declares a cross-project or cross-module reference.
// Go equivalent of Java @DocUses.
//
//	//docspec:uses artifact="com.example:auth-service" flow="token-validation"
type UsesMeta struct {
	Artifact    string `json:"artifact"`
	Flow        string `json:"flow,omitempty"`
	Step        string `json:"step,omitempty"`
	Member      string `json:"member,omitempty"`
	Description string `json:"description,omitempty"`
}

// UsesAllMeta is the container for multiple UsesMeta entries.
// Go equivalent of Java @DocUsesAll.
type UsesAllMeta struct {
	Uses []UsesMeta `json:"value"`
}

// SpecExampleMeta marks a test function as a verified, executable example
// attached to a specific documented element.
// Go equivalent of Java @DocSpecExample.
//
//	//docspec:specexample attachTo="pkg.Service.Generate" title="Generate a curriculum"
type SpecExampleMeta struct {
	AttachTo string `json:"attachTo"`
	Title    string `json:"title,omitempty"`
}

// ---------------------------------------------------------------------------
// DSTI types (Java: @DocOrdering, @DocPreserves, @DocCompare, @DocRelation,
//                   @DocBoundary, @DocStateMachine, @DocIntentional,
//                   @DocConservation, @DocDeterministic, @DocIdempotent)
// ---------------------------------------------------------------------------

// OrderingMeta declares ordering guarantees provided by a method.
// Go equivalent of Java @DocOrdering.
//
//	//docspec:ordering "Results returned in descending order by creation timestamp"
type OrderingMeta struct {
	Value string `json:"value"`
}

// PreservesMeta declares fields that must be preserved through a method's execution.
// Go equivalent of Java @DocPreserves.
//
//	//docspec:preserves fields="account.balance,account.owner"
type PreservesMeta struct {
	Fields []string `json:"fields"`
}

// CompareMeta documents comparison semantics for a method.
// Go equivalent of Java @DocCompare.
//
//	//docspec:compare "natural ordering by last name, then first name"
type CompareMeta struct {
	Value string `json:"value"`
}

// RelationMeta documents a relationship between entities.
// Go equivalent of Java @DocRelation.
//
//	//docspec:relation value="parent-child" target="Department"
type RelationMeta struct {
	Value  string `json:"value"`
	Target string `json:"target,omitempty"`
}

// BoundaryMeta marks an architectural boundary.
// Go equivalent of Java @DocBoundary.
//
// @docspec:intentional "Declares an anti-corruption layer or architectural boundary on a type"
//
//	//docspec:boundary "anti-corruption layer"
type BoundaryMeta struct {
	Value string `json:"value"`
}

// StateMachineMeta documents a state machine on the annotated type.
// Go equivalent of Java @DocStateMachine.
//
// @docspec:intentional "Documents valid states, initial state, and allowed transitions for a state machine"
//
//	//docspec:statemachine states="DRAFT,PENDING,APPROVED" initial="DRAFT" transitions="DRAFT->PENDING,PENDING->APPROVED"
type StateMachineMeta struct {
	States      []string `json:"states"`
	Initial     string   `json:"initial,omitempty"`
	Transitions []string `json:"transitions,omitempty"`
}

// IntentionalMeta declares the primary intent of a method.
// Go equivalent of Java @DocIntentional.
//
// @docspec:intentional "Captures the explicit semantic intent of a function for DSTI analysis"
//
//	//docspec:intentional value="Transfers funds between accounts" preserves="totalBalance,auditTrail"
type IntentionalMeta struct {
	Value     string   `json:"value"`
	Preserves []string `json:"preserves,omitempty"`
}

// ConservationMeta declares a conservation law -- a quantity preserved through
// a transformation.
// Go equivalent of Java @DocConservation.
//
//	//docspec:conservation "Total balance across all accounts remains constant"
type ConservationMeta struct {
	Value string `json:"value"`
}

// DeterministicMeta marks a method as deterministic -- same inputs always
// produce the same outputs.
// Go equivalent of Java @DocDeterministic.
//
// @docspec:intentional "Marker type asserting referential transparency for a function"
//
//	//docspec:deterministic
type DeterministicMeta struct{}

// IdempotentMeta marks a method as idempotent -- calling it multiple times
// with the same arguments produces the same result.
// Go equivalent of Java @DocIdempotent.
//
//	//docspec:idempotent
type IdempotentMeta struct{}

// ---------------------------------------------------------------------------
// Quality / privacy types (Java: @DocTestStrategy, @DocTestSkip, @DocPII
//                          [already in docspec.go], @DocSensitive)
// ---------------------------------------------------------------------------

// TestStrategyMeta documents the test strategy for a type or method.
// Go equivalent of Java @DocTestStrategy.
//
//	//docspec:teststrategy value="integration" scenarios="happy path,invalid input returns 400"
type TestStrategyMeta struct {
	Value     string   `json:"value"`
	Scenarios []string `json:"scenarios,omitempty"`
}

// TestSkipMeta marks a method where automated test generation should be skipped.
// Go equivalent of Java @DocTestSkip.
//
//	//docspec:testskip reason="Requires physical hardware connection"
type TestSkipMeta struct {
	Reason string `json:"reason,omitempty"`
}

// SensitiveMeta marks data that should not be logged or returned in API responses.
// Unlike PIIMeta, this covers any data sensitive for security, compliance, or
// business reasons.
// Go equivalent of Java @DocSensitive.
//
//	//docspec:sensitive reason="Contains internal routing token"
type SensitiveMeta struct {
	Reason string `json:"reason,omitempty"`
}

// ---------------------------------------------------------------------------
// Metadata / documentation types (Java: @DocAudience, @DocContext, @DocEndpoint,
//                                       @DocExample, @DocExamples, @DocField,
//                                       @DocHidden, @DocOptional, @DocTags)
// ---------------------------------------------------------------------------

// AudienceMeta declares the intended audience visibility level for an element.
// Go equivalent of Java @DocAudience.
//
//	//docspec:audience "partner"
type AudienceMeta struct {
	Value string `json:"value"`
}

// ContextMeta documents the runtime context for a type, including its inputs,
// associated flow, and cross-project dependencies.
// Go equivalent of Java @DocContext.
//
//	//docspec:context id="generation-context" name="Generation Context" flow="curriculum-generation"
type ContextMeta struct {
	ID     string             `json:"id,omitempty"`
	Name   string             `json:"name,omitempty"`
	Inputs []ContextInputMeta `json:"inputs,omitempty"`
	Flow   string             `json:"flow,omitempty"`
	Uses   []ContextUsesMeta  `json:"uses,omitempty"`
}

// EndpointMeta maps an SDK method to its underlying REST API endpoint.
// Go equivalent of Java @DocEndpoint.
//
//	//docspec:endpoint "POST /v1/curricula/generate"
type EndpointMeta struct {
	Value string `json:"value"`
}

// ExampleMeta attaches a code example to a documented method or type.
// Go equivalent of Java @DocExample.
//
//	//docspec:example title="Generate a curriculum" language="go" code="c := client.Generate(req)"
type ExampleMeta struct {
	Title    string `json:"title,omitempty"`
	Language string `json:"language,omitempty"`
	Code     string `json:"code,omitempty"`
	File     string `json:"file,omitempty"`
}

// ExamplesMeta is the container for multiple ExampleMeta entries.
// Go equivalent of Java @DocExamples.
type ExamplesMeta struct {
	Examples []ExampleMeta `json:"value"`
}

// FieldMeta marks a field for explicit inclusion in generated documentation.
// Go equivalent of Java @DocField.
//
//	//docspec:field description="Maximum number of retries" since="1.0"
type FieldMeta struct {
	Description string `json:"description,omitempty"`
	Since       string `json:"since,omitempty"`
}

// HiddenMeta is a marker that excludes an element from generated documentation.
// Go equivalent of Java @DocHidden.
//
//	//docspec:hidden
type HiddenMeta struct{}

// OptionalMeta is a marker that declares a parameter as optional.
// Go equivalent of Java @DocOptional.
//
//	//docspec:optional
type OptionalMeta struct{}

// TagsMeta associates searchable tags with a documented type.
// Go equivalent of Java @DocTags.
//
//	//docspec:tags "curriculum,generation,ai"
type TagsMeta struct {
	Values []string `json:"value"`
}

// ---------------------------------------------------------------------------
// Doc comment tag reference
// ---------------------------------------------------------------------------
//
// Go does not support annotations or decorators. DocSpec metadata in Go is
// expressed via:
//
//   1. Struct metadata types (above) attached as fields or package-level vars.
//   2. Doc comment tags using the //docspec: prefix.
//
// Supported doc comment tags (42 total, matching Java annotations):
//
// Core documentation:
//   //docspec:module     id="..." name="..." description="..." since="..." audience="..."
//   //docspec:method     since="..." deprecated="..."
//   //docspec:field      description="..." since="..."
//   //docspec:hidden
//   //docspec:optional
//   //docspec:tags       "tag1,tag2,tag3"
//   //docspec:audience   "public|partner|internal"
//   //docspec:endpoint   "METHOD /path"
//
// Flows and context:
//   //docspec:flow       id="..." name="..." description="..." trigger="..."
//   //docspec:step       id="..." name="..." actor="..." type="..." ai=true
//   //docspec:context    id="..." name="..." flow="..."
//
// Errors and events:
//   //docspec:error      code="..." httpStatus=422 description="..." resolution="..."
//   //docspec:event      name="..." channel="..." deliveryGuarantee="..." trigger="..."
//
// Examples and cross-references:
//   //docspec:example    title="..." language="go" code="..." file="..."
//   //docspec:specexample attachTo="pkg.Type.Method" title="..."
//   //docspec:uses       artifact="..." flow="..." step="..." member="..."
//
// Protocols:
//   //docspec:asyncapi   channel="..." operation="..."
//   //docspec:grpc       service="..." method="..."
//   //docspec:graphql    type="..." field="..."
//   //docspec:websocket  path="..." messages="..."
//   //docspec:command    value="..." aggregate="..."
//
// DSTI (semantic intent):
//   //docspec:ordering       "description of ordering guarantee"
//   //docspec:preserves      fields="field1,field2"
//   //docspec:compare        "comparison semantics description"
//   //docspec:relation       value="parent-child" target="Entity"
//   //docspec:boundary       "anti-corruption layer"
//   //docspec:statemachine   states="S1,S2" initial="S1" transitions="S1->S2"
//   //docspec:intentional    value="intent description" preserves="f1,f2"
//   //docspec:conservation   "conservation law description"
//   //docspec:deterministic
//   //docspec:idempotent
//   //docspec:invariant      on="Entity" rules="rule1,rule2"
//   //docspec:monotonic      direction="increasing"
//
// Quality and privacy:
//   //docspec:performance    expectedLatency="<6s at p99" bottleneck="..."
//   //docspec:teststrategy   value="integration" scenarios="s1,s2"
//   //docspec:testskip       reason="..."
//   //docspec:pii            value="email" retention="90 days" gdprBasis="consent"
//   //docspec:sensitive      reason="..."
