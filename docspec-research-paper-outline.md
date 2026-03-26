# Multi-Channel Intent Extraction for Deterministic Semantic Test Generation

## Research Paper Outline — ICSE/FSE Submission

**Authors:** Gustavo Aniceto
**Affiliation:** Aniceto Holdings / Independent Research
**Target Venue:** ICSE 2027 or FSE 2027

---

## Abstract (250 words)

Automated test generation remains a fundamental challenge in software engineering. Existing approaches either generate superficial tests (random/symbolic execution), require expensive LLM inference (AI-based generation), or produce tautological tests that verify implementation against itself. We present DSTI (DocSpec Test Intelligence), a deterministic system that extracts developer intent from 13 independent channels in source code — including naming conventions, guard clauses, branch structure, data flow patterns, exception messages, loop properties, and constant declarations — and generates semantically meaningful property-based tests without artificial intelligence. 

The key insight is that developers embed behavioral specifications across multiple redundant channels in their code: a method named `ensureNoDuplicates` makes a claim (via naming) that can be verified independently of the implementation (via property testing). By cross-verifying intent signals across channels, DSTI detects bugs that live in the gap between what developers claim and what code actually does.

We introduce the Intent Signal Density (ISD) metric, which quantifies the extractable behavioral information per method and correlates with test quality. We evaluate DSTI on 835 real bugs from the Defects4J benchmark, demonstrating X% bug detection with zero developer annotations in Y% of methods. We compare against EvoSuite, Randoop, and LLM-based generators across Java, TypeScript, Rust, and Python. We present a developer study (N=25) measuring annotation burden, false positive rate, and perceived test quality. Finally, we demonstrate meta-self-hosting: DSTI generates its own test suite, achieving Z% branch coverage of the DSTI processor.

---

## 1. Introduction (2 pages)

### 1.1 The Problem

Testing is the most time-consuming and least-loved part of software development. Developers skip it under deadline pressure. When written, tests are often superficial (`assertNotNull`) or tautological (testing that code does what the code does). When code changes, tests drift. The gap between "code that works" and "code that is verified to work" costs the industry billions annually.

### 1.2 Current Approaches and Their Limitations

**Random/symbolic execution (EvoSuite, Randoop):** Generate high-coverage tests but with meaningless assertions. Achieve ~65% bug detection on Defects4J but tests are unreadable and unmaintainable.

**LLM-based generation (CodaMosa, TestPilot, ChatGPT):** Generate readable tests but hallucinate specifications, require expensive inference, and produce non-deterministic output. Results vary per-run. Cannot guarantee correctness of the tests themselves.

**Design-by-contract (Eiffel, JML):** Powerful but require developers to write formal specifications — the very activity developers avoid. Adoption has been minimal outside academic contexts.

**The tautology problem:** Any system that derives test assertions solely from the implementation faces a fundamental limitation: if the code has a bug, the derived assertion encodes the same bug.

### 1.3 Our Insight

Developers embed behavioral specifications in their code through multiple independent channels that are NOT the implementation logic. A method named `ensureNoDuplicates` makes a testable claim through its name alone. A guard clause `if (x < 1) throw ...` defines a boundary through its condition. An exception message `"must be between 1 and 40"` declares a specification through its text. These channels are independently verifiable against the actual implementation.

By extracting intent from multiple channels and cross-verifying them, we can:
1. Generate tests that are NOT tautological (they test name vs. implementation, not implementation vs. implementation)
2. Do so deterministically, without AI
3. Produce property-based tests that verify behaviors across hundreds of random inputs
4. Detect bugs that manifest as inconsistencies between channels

### 1.4 Contributions

1. **Multi-channel intent extraction:** A formal framework for extracting behavioral specifications from 13 independent code channels.
2. **Cross-channel verification:** A method for detecting bugs as inconsistencies between intent channels.
3. **Intent Signal Density (ISD):** A metric quantifying extractable behavioral information per method, correlating with test quality.
4. **DSTI implementation:** A working system generating property-based tests for Java, TypeScript, Rust, and Python.
5. **Empirical evaluation:** Defects4J results + developer study demonstrating effectiveness and usability.

---

## 2. Background and Related Work (2 pages)

### 2.1 Property-Based Testing
QuickCheck (Haskell), jqwik (Java), fast-check (JS), proptest (Rust), Hypothesis (Python). These frameworks verify properties over random inputs but require developers to write the properties manually. DSTI automates property discovery.

### 2.2 Mutation Testing
PIT (Java), Stryker (JS). Evaluates test quality by injecting faults. Complementary to DSTI — mutation testing measures how good tests are, DSTI generates the tests.

### 2.3 Specification Mining
Daikon, GK-tail. Infer specifications from runtime traces. Requires execution, produces tautological specs (describes what code does, not what it should do). DSTI extracts specifications from code structure, not execution.

### 2.4 AI Test Generation
EvoSuite (search-based), Randoop (random), CodaMosa (LLM-guided search), TestPilot (LLM). Comparison points for our evaluation.

### 2.5 Design-by-Contract
Eiffel, JML, CodeContracts. Formal pre/post conditions. High quality but require explicit specification writing. DSTI extracts implicit specifications from existing code patterns.

---

## 3. Multi-Channel Intent Extraction (4 pages)

### 3.1 Channel Taxonomy

Formal definition of each of the 13 channels:

| # | Channel | Signal Type | Language Independence |
|---|---|---|---|
| 1 | Naming semantics | Verb → behavioral claim | Universal (naming conventions shared) |
| 2 | Guard clauses | Precondition → boundary | Universal (pattern varies per language) |
| 3 | Branch structure | Partition → path coverage | Universal |
| 4 | Name-behavior gap | Cross-channel inconsistency | Universal |
| 5 | Return type structure | Postcondition → output shape | Universal (type systems vary) |
| 6 | Assignment patterns | Data flow → preservation | Universal |
| 7 | Loop/iterator patterns | Cardinality → collection properties | Universal (syntax varies) |
| 8 | Error handling | Failure → recovery behavior | Varies (exception vs Result vs error value) |
| 9 | Assignment chain analysis | Source → sink tracing | Universal |
| 10 | Catch block side effects | Error → observable behavior | Varies per language |
| 11 | Exception messages | Text → parseable specification | Universal |
| 12 | Constants | Named value → boundary | Universal |
| 13 | Equals/Comparable | Contract → mathematical properties | Varies per language |

### 3.2 Extraction Algorithms

For each channel: formal extraction algorithm with AST traversal strategy, pattern matching rules, and output representation.

### 3.3 Language-Specific Adaptations

How each channel's extraction adapts to Java, TypeScript, Rust, Python, C#, Go. Focus on: Rust's Result<T,E> vs exceptions, Go's error values vs exceptions, Python's dynamic typing challenges.

---

## 4. Cross-Channel Verification (2 pages)

### 4.1 Formal Model

Define: Intent(channel_i, method_m) = the behavioral claim extracted from channel i for method m.

Bug = ∃ i,j : Intent(channel_i, m) ≠ Intent(channel_j, m)

Theorem: If intent is independently extractable from N channels, and a bug affects at most K channels, then cross-verification detects all bugs where K < N.

### 4.2 Channel Independence

Argue that the 13 channels are (approximately) independent: a bug in the implementation doesn't systematically affect what the method name claims, what the guard clause checks, and what the exception message says.

### 4.3 Gap Classification

Classify detected gaps:
- **Definite bug:** Name says "active only" but code includes "paused" — one must be wrong
- **Probable bug:** Guard says < 1 but constant says MIN = 0 — boundary mismatch
- **Intentional divergence:** Name is generic but behavior is specific — developer chose convenient name

DSTI reports all gaps with confidence levels. `@DocIntentional` suppresses false positives.

---

## 5. Test Generation Pipeline (2 pages)

### 5.1 From Intent Graph to Properties

Each extracted intent signal maps to a testable property. Properties are expressed in a language-agnostic DSL, then translated to target language assertion frameworks.

### 5.2 Property Expression DSL

Formal grammar definition. Examples of translations to JUnit/Vitest/pytest/proptest assertions.

### 5.3 Dependency Classification and Mock Boundaries

The algorithm for walking the dependency graph and determining mock vs real decisions for unit vs integration tests.

### 5.4 Fixture Generation

How test inputs are derived from type constraints, guard boundaries, ORM annotations, and OpenAPI examples.

---

## 6. Intent Signal Density (1 page)

### 6.1 Definition

ISD(method) = weighted sum of extractable intent signals across all channels.

### 6.2 Empirical Correlation

Show that ISD > 8 correlates with 95%+ bug detection. ISD < 4 correlates with poor test quality. Argue that ISD is also a proxy for code quality — well-written code naturally has high ISD.

### 6.3 The Virtuous Cycle

DSTI's feedback loop encourages higher ISD, which improves code quality, which improves test quality. The testing tool becomes a code quality tool.

---

## 7. Evaluation: Defects4J (3 pages)

### 7.1 Methodology

- Select all 835 bugs from Defects4J
- For each bug: run DSTI on pre-fix version, check if any generated test fails on buggy code and passes on fixed code
- Compare against EvoSuite, Randoop, and an LLM-based generator

### 7.2 Results

Table: Bug detection rate per tool, per bug category (off-by-one, null handling, wrong condition, missing case, incorrect formula, etc.)

### 7.3 Analysis

Which channels contributed most per bug category? Which bugs did DSTI miss and why?

---

## 8. Evaluation: Developer Study (2 pages)

### 8.1 Protocol

25 developers (5 per language: Java, TypeScript, Rust, Python, Go). Each uses DSTI on their own project for 2 weeks. Measure: false positive rate, annotation burden (minutes per project), test quality rating (1-5), bug detection (did DSTI find bugs they didn't know about?).

### 8.2 Results

Quantitative: average false positive rate, average annotation time, average quality rating.
Qualitative: developer feedback on gap reports, ISD feedback, generated test readability.

---

## 9. Multi-Language Generalization (1 page)

Results across 4 languages. Channel extraction quality per language. Test generation idiomaticity per language. Limitations for dynamically typed languages (Python).

---

## 10. Meta-Self-Hosting (1 page)

DSTI generates tests for the DSTI processor itself. Report: number of auto-derived tests, branch coverage, bugs found during development via self-hosted DSTI.

---

## 11. Threats to Validity (0.5 pages)

- Defects4J: Java-heavy, may not represent all bug types
- ISD thresholds: calibrated on limited dataset
- Channel weights: manually tuned, could be learned
- Language coverage: Python dynamic typing challenges

---

## 12. Discussion (1 page)

What DSTI misses: concurrency, performance, complex algorithms, integration bugs. Relationship to formal verification. Future work: Tree-sitter universal extraction, LSP integration, concurrency channel.

---

## 13. Conclusion (0.5 pages)

Multi-channel intent extraction produces semantically meaningful tests that catch X% of real-world bugs without AI, annotations, or developer effort in Y% of methods. DSTI represents a new paradigm: extracting implicit specifications from the redundancy in how developers write code.

---

## Research Timeline

| Month | Activity |
|---|---|
| Month 1-2 | Complete DSTI implementation for Java (13 channels + test generation) |
| Month 3 | Run Defects4J evaluation |
| Month 4 | Implement TypeScript, Rust, Python extractors |
| Month 5 | Developer study (recruit + execute) |
| Month 6 | Write paper, submit to ICSE/FSE 2027 |

---

*This paper would add to Gustavo's existing IEEE publication ("Web3DB: Web 3.0 RDBMS for Individual Data Ownership," IEEE GBC 2025) and establish a research presence in the software testing domain.*
