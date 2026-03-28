/**
 * Scaffolding logic for create-docspec-site.
 *
 * Accepts a ProjectConfig from the interactive prompts and generates
 * a fully populated DocSpec documentation site with all configuration,
 * starter docs, and directory structure.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig, ArtifactConfig } from "./prompts.js";

/**
 * Scaffold a new DocSpec site from interactive configuration.
 */
export async function scaffold(config: ProjectConfig): Promise<void> {
  const projectDir = path.resolve(process.cwd(), config.name);

  // Create project directory
  if (fs.existsSync(projectDir)) {
    const contents = fs.readdirSync(projectDir);
    if (contents.length > 0) {
      throw new Error(`Directory "${config.name}" already exists and is not empty.`);
    }
  } else {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Create all directories
  const dirs = [
    "docs/getting-started",
    "docs/architecture",
    "docs/guides",
    "assets",
  ];
  if (config.hasOpenApi) {
    dirs.push("specs");
  }
  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
  }

  // Write all files
  writePackageJson(projectDir, config);
  writeConfigYaml(projectDir, config);
  writeGitignore(projectDir);
  writeIntroduction(projectDir, config);
  writeQuickstart(projectDir, config);
  writeInstallation(projectDir, config);
  writeArchitectureOverview(projectDir, config);
  writeFirstGuide(projectDir, config);
}

// ---------------------------------------------------------------------------
// File writers
// ---------------------------------------------------------------------------

function writePackageJson(projectDir: string, config: ProjectConfig): void {
  const themePkg = `@docspec/theme-${config.theme}`;
  const pkg = {
    name: config.name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "docspec dev",
      build: "docspec build",
      validate: "docspec validate",
      coverage: "docspec coverage",
    },
    dependencies: {
      docspec: "latest",
      "@docspec/core": "latest",
      [themePkg]: "latest",
    },
  };

  const filePath = path.join(projectDir, "package.json");
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}

function writeConfigYaml(projectDir: string, config: ProjectConfig): void {
  const lines: string[] = [];

  // Site section
  lines.push("site:");
  lines.push(`  name: "${config.name}"`);
  lines.push(`  theme: "@docspec/theme-${config.theme}"`);
  lines.push("");

  // Artifacts section
  if (config.artifacts.length > 0) {
    lines.push("artifacts:");
    for (const artifact of config.artifacts) {
      lines.push(...formatArtifactYaml(artifact));
    }
  } else {
    lines.push("artifacts: []");
  }
  lines.push("");

  // OpenAPI
  if (config.hasOpenApi && config.openApiPath) {
    lines.push("openapi:");
    lines.push(`  spec: "${config.openApiPath}"`);
    lines.push("  merge: true");
    lines.push("");
  }

  // Navigation
  lines.push("navigation:");
  lines.push("  - section: Getting Started");
  lines.push("    items:");
  lines.push("      - docs/getting-started/introduction.md");
  lines.push("      - docs/getting-started/quickstart.md");
  lines.push("      - docs/getting-started/installation.md");

  if (config.artifacts.length > 0) {
    lines.push("  - section: Libraries");
    lines.push("    items: [artifacts/auto]");
  }

  lines.push("  - section: Architecture");
  lines.push("    items:");
  lines.push("      - docs/architecture/overview.md");
  if (config.artifacts.length > 0) {
    lines.push("      - flows/auto");
    lines.push("      - data-models/auto");
  }

  lines.push("  - section: Guides");
  lines.push("    items:");
  lines.push("      - docs/guides/first-guide.md");
  lines.push("");

  // DSTI
  if (config.enableDsti) {
    lines.push("dsti:");
    lines.push("  enabled: true");
    lines.push("  generateTests: true");
    lines.push("  channels:");
    lines.push("    - nameSemantics");
    lines.push("    - parameters");
    lines.push("    - returnType");
    lines.push("    - annotations");
    lines.push("    - exceptions");
    lines.push("    - methodBody");
    lines.push("    - dataFlow");
    lines.push("    - loopProperties");
    lines.push("    - nullChecks");
    lines.push("    - assertions");
    lines.push("    - validationAnnotations");
    lines.push("    - logStatements");
    lines.push("    - methodCalls");
    lines.push("");
  }

  // LLM integration
  if (config.llmOptions.length > 0) {
    lines.push("llm:");
    if (config.llmOptions.includes("llms-txt")) {
      lines.push("  llmsTxt: true");
    }
    if (config.llmOptions.includes("claude-md")) {
      lines.push("  claudeMd: true");
    }
    if (config.llmOptions.includes("mcp-server")) {
      lines.push("  mcpServer:");
      lines.push("    enabled: true");
      lines.push("    port: 3100");
    }
    if (config.llmOptions.includes("embeddings")) {
      lines.push("  embeddings:");
      lines.push("    enabled: true");
      lines.push("    provider: openai");
    }
    lines.push("");
  }

  // Registry config
  if (config.importRegistries && config.registrySource) {
    lines.push("registries:");
    switch (config.registrySource) {
      case "settings-xml":
        lines.push("  import: settings-xml");
        lines.push("  path: ~/.m2/settings.xml");
        break;
      case "npmrc":
        lines.push("  import: npmrc");
        lines.push("  path: ~/.npmrc");
        break;
      case "env":
        lines.push("  import: env");
        lines.push("  prefix: DOCSPEC_REGISTRY_");
        break;
      case "manual":
        lines.push("  servers:");
        lines.push("    - id: my-registry");
        lines.push("      url: https://registry.example.com");
        break;
    }
    lines.push("");
  }

  // Build section
  lines.push("build:");
  lines.push("  outputDir: ./out");
  lines.push("  cacheDir: ./.docspec-cache");
  lines.push("  search: true");
  lines.push("");

  const filePath = path.join(projectDir, "docspec.config.yaml");
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

function formatArtifactYaml(artifact: ArtifactConfig): string[] {
  const lines: string[] = [];

  switch (artifact.type) {
    case "maven":
      lines.push(`  - groupId: "${artifact.groupId}"`);
      lines.push(`    artifactId: "${artifact.artifactId}"`);
      lines.push(`    version: "${artifact.version}"`);
      lines.push(`    label: "${artifact.label}"`);
      if (artifact.color) lines.push(`    color: "${artifact.color}"`);
      break;
    case "npm":
      lines.push(`  - packageName: "${artifact.packageName}"`);
      lines.push(`    version: "${artifact.version}"`);
      lines.push(`    label: "${artifact.label}"`);
      if (artifact.color) lines.push(`    color: "${artifact.color}"`);
      break;
    case "local":
      lines.push(`  - path: "${artifact.path}"`);
      lines.push(`    label: "${artifact.label}"`);
      if (artifact.color) lines.push(`    color: "${artifact.color}"`);
      break;
    case "crate":
    case "pypi":
    case "nuget":
      lines.push(`  - type: "${artifact.type}"`);
      lines.push(`    packageName: "${artifact.packageName}"`);
      lines.push(`    version: "${artifact.version}"`);
      lines.push(`    label: "${artifact.label}"`);
      if (artifact.color) lines.push(`    color: "${artifact.color}"`);
      break;
  }

  return lines;
}

function writeGitignore(projectDir: string): void {
  const content = `node_modules/
.docspec-cache/
out/
dist/
.env
.env.local
*.log
.DS_Store
Thumbs.db
`;

  const filePath = path.join(projectDir, ".gitignore");
  fs.writeFileSync(filePath, content, "utf-8");
}

function writeIntroduction(projectDir: string, config: ProjectConfig): void {
  const langList = config.languages
    .map((l) => (l === "csharp" ? "C#" : l.charAt(0).toUpperCase() + l.slice(1)))
    .join(", ");

  const content = `---
title: Introduction
---

# Welcome to ${config.name}

This is the documentation site for **${config.name}**, built with [DocSpec](https://docspec.dev).

## What is this?

This site provides auto-generated, structured documentation for your codebase. DocSpec analyzes your source code and produces rich, navigable documentation that covers:

- **API Reference** -- Every public class, method, and type documented automatically
- **Architecture** -- Data flows, module dependencies, and system design
- **Data Models** -- Entity relationships and schema documentation
${config.enableDsti ? "- **Intent Analysis** -- DSTI-powered semantic analysis of your code's purpose\n" : ""}${config.hasOpenApi ? "- **REST API** -- OpenAPI spec integrated with source-level docs\n" : ""}

## Languages

This project documents code written in: ${langList}.

## Getting Started

Head to the [Quickstart](./quickstart.md) to get up and running, or check the [Installation](./installation.md) guide for detailed setup instructions.
`;

  const filePath = path.join(projectDir, "docs", "getting-started", "introduction.md");
  fs.writeFileSync(filePath, content, "utf-8");
}

function writeQuickstart(projectDir: string, config: ProjectConfig): void {
  const sections: string[] = [];

  sections.push(`---
title: Quickstart
---

# Quickstart

Get your documentation site running in under 5 minutes.

## 1. Install dependencies

\`\`\`bash
npm install
\`\`\`

## 2. Generate your docspec.json

Run the DocSpec processor for your language to generate the documentation artifact.
`);

  // Language-specific instructions
  if (config.languages.includes("java")) {
    sections.push(`### Java

Add the DocSpec Maven plugin to your \`pom.xml\`:

\`\`\`xml
<plugin>
  <groupId>io.docspec</groupId>
  <artifactId>docspec-maven-plugin</artifactId>
  <version>3.0.0</version>
</plugin>
\`\`\`

Then run:

\`\`\`bash
mvn docspec:generate
\`\`\`
`);
  }

  if (config.languages.includes("typescript")) {
    sections.push(`### TypeScript

Install the DocSpec TypeScript processor:

\`\`\`bash
npm install --save-dev @docspec/ts-processor
\`\`\`

Then run:

\`\`\`bash
npx docspec-ts generate
\`\`\`
`);
  }

  if (config.languages.includes("python")) {
    sections.push(`### Python

Install the DocSpec Python processor:

\`\`\`bash
pip install docspec-py
\`\`\`

Then run:

\`\`\`bash
docspec-py generate
\`\`\`
`);
  }

  if (config.languages.includes("rust")) {
    sections.push(`### Rust

Add the DocSpec Rust processor to your project:

\`\`\`bash
cargo install docspec-rs
\`\`\`

Then run:

\`\`\`bash
docspec-rs generate
\`\`\`
`);
  }

  if (config.languages.includes("csharp")) {
    sections.push(`### C#

Install the DocSpec C# processor:

\`\`\`bash
dotnet tool install --global DocSpec.Processor
\`\`\`

Then run:

\`\`\`bash
docspec-cs generate
\`\`\`
`);
  }

  if (config.languages.includes("go")) {
    sections.push(`### Go

Install the DocSpec Go processor:

\`\`\`bash
go install github.com/docspec/docspec-go@latest
\`\`\`

Then run:

\`\`\`bash
docspec-go generate
\`\`\`
`);
  }

  sections.push(`## 3. Start the dev server

\`\`\`bash
npx docspec dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your documentation.

## 4. Build for production

\`\`\`bash
npx docspec build
\`\`\`

The static site will be generated in the \`out/\` directory, ready to deploy.
`);

  const filePath = path.join(projectDir, "docs", "getting-started", "quickstart.md");
  fs.writeFileSync(filePath, sections.join("\n"), "utf-8");
}

function writeInstallation(projectDir: string, config: ProjectConfig): void {
  const themePkg = `@docspec/theme-${config.theme}`;

  const content = `---
title: Installation
---

# Installation

## Prerequisites

- **Node.js** 18 or later
- **npm**, **pnpm**, or **yarn**
${config.languages.includes("java") ? "- **JDK 17** or later (for Java processor)\n" : ""}${config.languages.includes("python") ? "- **Python 3.10** or later (for Python processor)\n" : ""}${config.languages.includes("rust") ? "- **Rust 1.70** or later (for Rust processor)\n" : ""}${config.languages.includes("csharp") ? "- **.NET 8** or later (for C# processor)\n" : ""}${config.languages.includes("go") ? "- **Go 1.21** or later (for Go processor)\n" : ""}

## Install the documentation site

\`\`\`bash
cd ${config.name}
npm install
\`\`\`

This installs:
- \`@docspec/core\` -- the documentation engine
- \`${themePkg}\` -- the ${config.theme} theme
- \`docspec\` -- the CLI

## Project structure

\`\`\`
${config.name}/
  docs/                      # Your Markdown documentation
    getting-started/
      introduction.md
      quickstart.md
      installation.md
    architecture/
      overview.md
    guides/
      first-guide.md
${config.hasOpenApi ? "  specs/                     # OpenAPI specifications\n" : ""}  assets/                    # Images, logos, and static files
  docspec.config.yaml        # Site configuration
  package.json
\`\`\`

## Configuration

All site configuration lives in \`docspec.config.yaml\`. See the [DocSpec documentation](https://docspec.dev/docs/configuration) for all available options.

## Verify installation

\`\`\`bash
npx docspec validate
\`\`\`

This checks that your configuration is valid and all referenced artifacts can be resolved.
`;

  const filePath = path.join(projectDir, "docs", "getting-started", "installation.md");
  fs.writeFileSync(filePath, content, "utf-8");
}

function writeArchitectureOverview(projectDir: string, config: ProjectConfig): void {
  const content = `---
title: Architecture Overview
---

# Architecture Overview

This section provides a high-level overview of the system architecture.

## System Components

Describe the major components of your system here. DocSpec will automatically generate detailed module documentation from your source code.

## Data Flow

Document how data moves through your system. If you use \`@DocFlow\` annotations in your code, DocSpec will generate interactive flow diagrams automatically.

## Module Structure

Your codebase is organized into modules. DocSpec discovers these automatically from your package structure, or you can define custom groupings with \`@DocModule\`.

${config.artifacts.length > 0 ? `## Documented Artifacts

This site documents the following artifacts:

${config.artifacts.map((a) => `- **${a.label}** (${a.type})`).join("\n")}
` : ""}${config.enableDsti ? `## Intent Analysis

DSTI (Deep Structural and Textual Intent) analysis is enabled for this project. DocSpec will analyze 13 semantic channels in your source code to understand method intent and generate test suggestions.
` : ""}${config.hasOpenApi ? `## API Layer

This project includes an OpenAPI specification that is merged with source-level documentation for a unified API reference.
` : ""}
## Next Steps

- Add \`@DocModule\` annotations to define logical groupings
- Use \`@DocFlow\` to document data flows
- Add \`@DocContext\` for domain-specific context
`;

  const filePath = path.join(projectDir, "docs", "architecture", "overview.md");
  fs.writeFileSync(filePath, content, "utf-8");
}

function writeFirstGuide(projectDir: string, config: ProjectConfig): void {
  const content = `---
title: Your First Guide
---

# Your First Guide

This is an example guide showing how to write documentation with Markdoc.

## Basic Formatting

You can use standard Markdown formatting:

- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- \`inline code\` for code references
- [Links](https://docspec.dev) to external resources

## Code Blocks

Use fenced code blocks with language hints for syntax highlighting:

\`\`\`${config.languages[0] === "csharp" ? "csharp" : config.languages[0] || "java"}
// Your code example here
\`\`\`

## Callouts

Use callouts to highlight important information:

{% callout type="info" %}
This is an informational callout. Use it to provide additional context.
{% /callout %}

{% callout type="warning" %}
This is a warning callout. Use it to highlight potential issues.
{% /callout %}

## Cross-References

DocSpec automatically links to documented types and methods. When you reference a class name or method that exists in your docspec.json, it becomes a clickable link.

## Writing More Guides

Create new \`.md\` files in the \`docs/guides/\` directory and add them to the \`navigation\` section in \`docspec.config.yaml\`.
`;

  const filePath = path.join(projectDir, "docs", "guides", "first-guide.md");
  fs.writeFileSync(filePath, content, "utf-8");
}
