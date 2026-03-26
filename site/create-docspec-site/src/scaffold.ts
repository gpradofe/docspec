/**
 * Scaffolding logic for create-docspec-site.
 *
 * Creates a new project directory with all the files needed to
 * get a DocSpec documentation site up and running.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scaffold a new DocSpec site into the given directory.
 */
export async function scaffold(
  projectName: string,
  _template: string,
): Promise<void> {
  const projectDir = path.resolve(process.cwd(), projectName);

  console.log();
  console.log(
    chalk.bold(`Creating a new DocSpec site in ${chalk.cyan(projectDir)}`),
  );
  console.log();

  // Create project directory
  if (fs.existsSync(projectDir)) {
    const contents = fs.readdirSync(projectDir);
    if (contents.length > 0) {
      console.error(
        chalk.red(`Error: Directory "${projectName}" already exists and is not empty.`),
      );
      process.exit(1);
    }
  } else {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Write package.json
  writePackageJson(projectDir, projectName);

  // Write docspec.config.yaml
  writeConfigYaml(projectDir);

  // Write docs/getting-started/index.md
  writeGettingStarted(projectDir);

  // Print success message
  printSuccess(projectName);
}

// ---------------------------------------------------------------------------
// File writers
// ---------------------------------------------------------------------------

function writePackageJson(projectDir: string, projectName: string): void {
  const pkg = {
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "docspec dev",
      build: "docspec build",
    },
    dependencies: {
      docspec: "latest",
      "@docspec/core": "latest",
      "@docspec/theme-stripe": "latest",
    },
  };

  const filePath = path.join(projectDir, "package.json");
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  logCreated("package.json");
}

function writeConfigYaml(projectDir: string): void {
  const templatesDir = path.resolve(__dirname, "..", "templates");
  const templatePath = path.join(templatesDir, "docspec.config.yaml");

  let content: string;
  if (fs.existsSync(templatePath)) {
    content = fs.readFileSync(templatePath, "utf-8");
  } else {
    // Fallback: inline template if the bundled template is not found
    content = getDefaultConfigYaml();
  }

  const filePath = path.join(projectDir, "docspec.config.yaml");
  fs.writeFileSync(filePath, content, "utf-8");
  logCreated("docspec.config.yaml");
}

function writeGettingStarted(projectDir: string): void {
  const docsDir = path.join(projectDir, "docs", "getting-started");
  fs.mkdirSync(docsDir, { recursive: true });

  const templatesDir = path.resolve(__dirname, "..", "templates");
  const templatePath = path.join(
    templatesDir,
    "docs",
    "getting-started",
    "index.md",
  );

  let content: string;
  if (fs.existsSync(templatePath)) {
    content = fs.readFileSync(templatePath, "utf-8");
  } else {
    // Fallback: inline template
    content = getDefaultGettingStarted();
  }

  const filePath = path.join(docsDir, "index.md");
  fs.writeFileSync(filePath, content, "utf-8");
  logCreated("docs/getting-started/index.md");
}

// ---------------------------------------------------------------------------
// Console helpers
// ---------------------------------------------------------------------------

function logCreated(relativePath: string): void {
  console.log(`  ${chalk.green("created")} ${relativePath}`);
}

function printSuccess(projectName: string): void {
  console.log();
  console.log(chalk.green.bold("Done!") + " Your DocSpec site is ready.");
  console.log();
  console.log("Next steps:");
  console.log();
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan("  npm install"));
  console.log(chalk.cyan("  npx docspec dev"));
  console.log();
  console.log(
    `Edit ${chalk.bold("docspec.config.yaml")} to add your DocSpec artifacts.`,
  );
  console.log();
}

// ---------------------------------------------------------------------------
// Inline template fallbacks
// ---------------------------------------------------------------------------

function getDefaultConfigYaml(): string {
  return `# DocSpec Configuration
# See: https://docspec.dev/docs/configuration

site:
  name: "My Documentation"
  # logo: ./assets/logo.svg
  # baseUrl: https://docs.example.com
  theme: "@docspec/theme-stripe"

# Add your DocSpec artifacts here:
artifacts: []
  # Local file example:
  # - path: ./path/to/docspec.json
  #   label: "My Library"
  #   color: "#818cf8"

  # Maven artifact example:
  # - groupId: com.example
  #   artifactId: my-library
  #   version: "1.0.0"
  #   label: "My Library"

# Navigation structure:
# navigation:
#   - section: Libraries
#     items: [artifacts/auto]
#   - section: Architecture
#     items: [flows/auto, data-models/auto]

build:
  outputDir: ./out
  cacheDir: ./.docspec-cache
  search: true
`;
}

function getDefaultGettingStarted(): string {
  return `---
title: Getting Started
---

# Getting Started

Welcome to your DocSpec documentation site!

## Quick Start

1. Add your \`docspec.json\` artifacts to \`docspec.config.yaml\`
2. Run \`npx docspec dev\` to start the dev server
3. Run \`npx docspec build\` to generate a static site

## Learn More

Visit [docspec.dev](https://docspec.dev) for full documentation.
`;
}
