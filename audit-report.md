# DocSpec Codebase Audit Report

## Audit Date: March 2026
## Audited Against: DocSpec v3 Final Specification (SPEC.md)

---

## Executive Summary

**Total files:** 863 | **Total lines of code:** 74,561 | **Languages:** 6 (Java, TypeScript, Python, Rust, Go, C#)

The codebase has impressive breadth — all 6 languages have annotations, processors, and framework detectors. The Java processor is the most mature at 14,285 lines with a real 946-line annotation processor. The site framework has 26,170 lines across CLI, core, and 3 themes. However, there are significant issues in **structure**, **visual quality**, **implementation depth**, and **spec compliance**.

### Severity Breakdown

- 🔴 **CRITICAL (13 issues)** — Blocks the project from looking/working like our vision
- 🟡 **MAJOR (19 issues)** — Significant gaps vs spec, needs implementation
- 🟢 **MINOR (11 issues)** — Polish, missing files, small gaps

---

## 🔴 CRITICAL ISSUES

### C1: File Structure Does Not Match Spec Architecture

**Current:** Flat language directories at root (`java/`, `typescript/`, `python/`, etc.)
**Spec says:** `packages/` wrapper with concern-based grouping (`packages/annotations/java/`, `packages/processor/java/`, etc.)

The current structure organizes by language first. Our spec organizes by concern first, language second. This matters because:
- A developer looking for "how does annotation processing work" has to know to look in `java/docspec-processor-java/` vs `typescript/processor/`
- The relationship between annotations, processor, and test-generator is hidden
- Missing: `packages/` top-level, `packages/test-generator/` as separate package

### C2: No README.md or LICENSE File

Root directory has no README.md, no LICENSE. These are table-stakes for any open-source project, especially one targeting academic publication and EB-1A evidence.

### C3: Endpoint Page Is NOT Stripe-Style 3-Panel Layout

**Current:** Single-column layout with stacked sections (params, response, errors)
**Spec says:** Split layout — left panel for parameters/description, right panel for code examples with language tabs (curl/java/typescript/python), response preview below code

This is the #1 visual differentiator. The prototype we built earlier had this. The current implementation looks like generic documentation, not like Stripe.

### C4: No Syntax Highlighting in CodeBlock Component

The `CodeBlock.tsx` renders plain `<code>` with no syntax highlighting library (no Prism, Shiki, or highlight.js). All code appears as monochrome text. This is unacceptable for a documentation tool — it's literally the most visible component.

### C5: No Language Tabs on Code Examples

Spec says endpoint and member pages should show code examples in multiple languages (curl, Java, TypeScript, Python, etc.) with clickable tabs, auto-generated from `@DocEndpoint` SDK mappings. Current implementation has no tab system at all.

### C6: DSTI Channels Are Not Separated Into Individual Files

**Current:** All 13 channels are mixed into one 426-line `IntentGraphExtractor.java` with channel logic inline
**Spec says:** `processor/java/src/.../intent/channels/NamingChannel.java`, `GuardClauseChannel.java`, etc. — one file per channel

This matters for: testability (can't test channels independently), extensibility (can't add a 14th channel without modifying the monolith), and the research paper (each channel needs to be individually ablatable for the Defects4J evaluation).

### C7: DSTI Test Generators Produce Stubs, Not Real Tests

The test generators (Java, TypeScript, Rust, Python) output test files with `// TODO: implement` in the assertion bodies. Example: `prop_assert!(true); // TODO: implement`. The whole point of DSTI is that the tests are meaningful. These are empty shells.

53 TODOs in the DSTI generators alone. The generator should use the intent graph signals to fill in actual assertions (assertEquals, assertThrows, property checks), not TODO placeholders.

### C8: Missing `@DocCommutative` Annotation

Listed in spec, not implemented in any language. The Java annotations directory has 43 files but `DocCommutative.java` is absent.

### C9: Intent Graph Schema Is a Stub (32 Lines)

**Current:** 32-line JSON file that just references docspec.schema.json definitions
**Spec says:** Comprehensive standalone schema defining all 13 channel signal types, cross-channel verification results, ISD scores, gap reports

The intent graph is the CORE of DSTI and the research paper. A 32-line schema is not sufficient.

### C10: GuidePage Is 14 Lines — No Markdown Rendering

The GuidePage just does `dangerouslySetInnerHTML`. There's no Markdoc integration, no MDX support, no table of contents generation from headings, no code block rendering within guides. Guides are the "Learn" section — first thing users see.

### C11: ChangelogPage Is a Placeholder

Just displays "Coming in Phase 4." The version differ (`site/core/src/diff/engine.ts`) exists but the page doesn't use it. Changelog is critical for the "bump version, docs update" workflow.

### C12: No Root Build System (Cannot Build From Clone)

No root `package.json`, `pom.xml`, or `Makefile`. A developer who clones the repo has no way to build everything. Each subdirectory has its own build but there's no orchestration.

### C13: Search Is Not Functional

`SearchDialog.tsx` (103 lines) has UI chrome but no actual search implementation. No FlexSearch, no Algolia, no index building. The `Cmd+K` shortcut and search box are visual-only.

---

## 🟡 MAJOR ISSUES

### M1: No 3 Crates/PyPI/NuGet Resolvers

Site core has `maven-resolver.ts` and `npm-resolver.ts` but no `crates-resolver.ts`, `pypi-resolver.ts`, or `nuget-resolver.ts`. Spec lists all 5 registry types.

### M2: No `.npmrc` Parser

`settings-xml.ts` exists for Maven but no `npmrc-parser.ts` for npm credential import.

### M3: MemberPage Missing Split Layout

MemberPage (272 lines) is single-column. Spec says split: left for method details, right for code examples panel — matching Stripe's API reference style.

### M4: EndpointPage Missing Internal Flow Trace

Spec says endpoint pages should show a collapsible "Internal Path" trace linking to the `@DocFlow` triggered by that endpoint. Not implemented.

### M5: EndpointPage Missing Related Errors, Events, Data Models Links

Spec says endpoint pages cross-link to `@DocError` entries, `@DocEvent` entries, and data model types. Not implemented.

### M6: FlowPage Missing Data Store Operations Per Step

Spec says each flow step shows its database operations (which tables, READ/WRITE, transaction boundaries). The FlowStep type supports `dataStoreOps` but the FlowPage doesn't render them.

### M7: No Configuration Reference Page Content

`ConfigurationPage.tsx` (133 lines) exists but the processor's `ConfigurationExtractor.java` has limited extraction. Spec says extract `@Value`, `@ConfigurationProperties`, environment variable reads and generate a full property reference.

### M8: No Database Documentation Pages

`DataStorePage.tsx` and `DataModelPage.tsx` exist in the theme but schema introspection is incomplete. `DatabaseSchemaIntrospector.java` has TODO on index parsing. No migration timeline rendering. No query-to-index analysis visualization.

### M9: FlowDiagram Is Vertically Stacked Only

Current SVG renders a single vertical column of boxes. Spec prototype had horizontal elements, project boundary coloring, retry loop arrows going backward, and animation on load. Current version is functional but not visually impressive.

### M10: No MCP Server Implementation

`site/core/src/mcp/server.ts` exists but needs verification that it actually exposes the 7 tools defined in the spec (search, get-class, get-endpoint, get-flow, get-trace, get-errors, get-tests).

### M11: No `llms.txt` / `CLAUDE.md` Generation Testing

Export files exist (`llms-txt.ts`, `llms-full-txt.ts`) but need verification they produce output matching the spec format. The `context.ts` CLI command exists.

### M12: 18 Test Files Total — Very Low Test Coverage

Only 18 test files across the entire 863-file codebase. The Java processor has ZERO tests. The DSTI core has ZERO tests. The site core has a few but most are minimal.

### M13: Framework Detector JSONs Exist But May Not Be Loaded

JSON files in `typescript/frameworks/`, `python/frameworks/`, etc. but need verification the processors actually load and use them. The spec says detectors should be pluggable JSON files.

### M14: No Privacy Page Rendering

`PrivacyPage.tsx` exists (105 lines) but the `PrivacyExtractor.java` and other language extractors need verification they populate the privacy fields in docspec.json.

### M15: No Observability Page Rendering

`ObservabilityPage.tsx` exists (217 lines) but extraction of Micrometer metrics, log statements, and trace spans needs verification.

### M16: Cross-Linker Missing "Referenced In" Population

`site/core/src/cross-linker/referenced-in.ts` exists but needs verification it actually populates the `referencedBy` field on members (which endpoints call this class, which flows reference it).

### M17: No Version Selector Functionality

`VersionSelector.tsx` (21 lines) is minimal. Multi-version artifact resolution and version switching UI is not implemented.

### M18: Property DSL Parser Not Connected to Test Generation

`dsti/core/src/property-dsl-parser.ts` (177 lines) exists and parses expressions, but the test generators don't use it. The generators use hardcoded templates instead of DSL-driven assertion generation.

### M19: Examples Missing `docspec.config.yaml` for Most Projects

Only `example-docs-site/`, `python-fastapi-service/`, `rust-finddoc-core/`, and `typescript-nexus-sdk/` have config files. The spring-boot-zero-config and waypoint-engine examples should demonstrate the full config-to-docs pipeline.

---

## 🟢 MINOR ISSUES

### m1: Extra Annotations Not in Spec
`DocAsyncAPI.java`, `DocGRPC.java`, `DocGraphQL.java`, `DocWebSocket.java`, `DocCommand.java`, `DocExamples.java`, `DocUsesAll.java` — present in code but not in spec's annotation table. Not a problem (they extend the spec) but should be documented.

### m2: Naming Inconsistency in Processors
Java uses `docspec-processor-java/`, TypeScript uses `processor/`, Python uses `processor/`. Should be consistent.

### m3: Go Uses Comment-Based Annotations
Go files use `// docspec:module` comment style as designed, but the comment parser (`go/processor/reader/comment_reader.go`) needs verification it handles all annotation types.

### m4: No Gradle Plugin Tasks for DSTI
`plugins/gradle/` has `GenerateTask.kt`, `ValidateTask.kt`, `CoverageTask.kt` but no `GenerateTestsTask.kt` or `DstiCheckTask.kt`.

### m5: No Cargo Plugin Implementation
`plugins/cargo/src/main.rs` exists but needs verification it's not a stub.

### m6: No dotnet Plugin Tests Task
`plugins/dotnet/` has Generate, Validate, Coverage commands but no GenerateTests command.

### m7: Research Paper in Wrong Location
`research/paper/main.tex` exists separately from our `dsti-paper.tex`. Should consolidate.

### m8: No `create-docspec-site` Functional Test
`site/create-docspec-site/` has scaffolder code but no test that actually runs it and verifies the output.

### m9: Themes Duplicated Heavily
`dark/` and `minimal/` themes are near-copies of `stripe/` with minor CSS changes. Should share components via a base theme.

### m10: CI Workflows Reference But Don't Test
`.github/workflows/` has 7 workflow files but several reference tools/steps that may not exist yet.

### m11: Missing `package-info.java` Files
Several Java packages lack `package-info.java` for JavaDoc generation.

---

## Structure Recommendation

Current flat structure should be reorganized to match the architecture we discussed. See the companion Claude Code prompt for the exact restructuring plan.

---

## Priority Action Plan

### Phase A: Critical Visual + Structure (Do First)
1. Restructure repo into `packages/` layout
2. Add README.md, LICENSE, root build orchestration
3. Implement Stripe-style 3-panel EndpointPage with code language tabs
4. Add syntax highlighting (Shiki or Prism) to CodeBlock
5. Separate DSTI channels into individual files (13 files)
6. Make DSTI test generators produce REAL assertions from intent signals
7. Flesh out intent-graph.schema.json to full spec
8. Add `@DocCommutative` annotation across all languages

### Phase B: Functional Completeness (Do Second)
9. Implement GuidePage with Markdoc rendering
10. Implement SearchDialog with FlexSearch
11. Add MemberPage split layout with code examples panel
12. Add internal flow trace to EndpointPage
13. Add cross-linking (Referenced In panels, endpoint→error, endpoint→event)
14. Implement version differ + ChangelogPage
15. Add crates/pypi/nuget resolvers + npmrc parser
16. Add data store operations rendering to FlowPage

### Phase C: Quality + Meta (Do Third)
17. Add tests for Java processor, DSTI core, site core (target 80%+ coverage)
18. Connect PropertyDSL parser to test generators
19. Implement full database schema introspection + migration timeline
20. Wire MCP server tools
21. Test llms.txt / CLAUDE.md generation
22. Add docspec.config.yaml to all example projects
23. Verify framework detector JSON loading across all languages
