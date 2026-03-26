import path from "node:path";
import fs from "node:fs/promises";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { devCommand } from "./commands/dev.js";
import { buildCommand } from "./commands/build.js";
import { resolveCommand } from "./commands/resolve.js";
import { validateCommand } from "./commands/validate.js";
import { coverageCommand } from "./commands/coverage.js";
import { contextCommand } from "./commands/context.js";
import { mcpServerCommand } from "./commands/mcp-server.js";
import { generateDotGraph } from "./commands/graph.js";
import { runDiff, formatDiff } from "./commands/diff.js";
import { generateOpenAPI } from "./commands/export.js";
import { generateTestReport } from "./commands/test-report.js";

const program = new Command();

program
  .name("docspec")
  .description("DocSpec documentation site framework")
  .version("0.1.0");

program
  .command("dev")
  .description("Start development server with hot reload")
  .option("-c, --config <path>", "Path to docspec.config.yaml", "docspec.config.yaml")
  .option("-p, --port <port>", "Port number", "3000")
  .action(devCommand);

program
  .command("build")
  .description("Build static documentation site")
  .option("-c, --config <path>", "Path to docspec.config.yaml", "docspec.config.yaml")
  .option("-o, --output <dir>", "Output directory")
  .action(buildCommand);

program
  .command("resolve")
  .description("Resolve and download artifact specs")
  .option("-c, --config <path>", "Path to docspec.config.yaml", "docspec.config.yaml")
  .action(resolveCommand);

program
  .command("validate")
  .description("Validate all docspec.json files against the schema")
  .option("-c, --config <path>", "Path to docspec.config.yaml", "docspec.config.yaml")
  .action(validateCommand);

program
  .command("coverage")
  .description("Report documentation coverage across all artifacts")
  .option("-c, --config <path>", "Path to docspec.config.yaml", "docspec.config.yaml")
  .action(coverageCommand);

program
  .command("context")
  .description("Generate llms.txt context files for AI consumption")
  .option("-c, --config <path>", "Config file path", "docspec.config.yaml")
  .option("-o, --output <dir>", "Output directory", ".")
  .action(contextCommand);

program
  .command("mcp-server")
  .description("Start MCP server for AI-queryable documentation")
  .option("-c, --config <path>", "Config file path", "docspec.config.yaml")
  .action(mcpServerCommand);

program
  .command("graph")
  .description("Generate dependency graph in DOT format")
  .option("-c, --config <path>", "Config file path", "docspec.config.yaml")
  .option("-o, --output <file>", "Output file (default: stdout)")
  .action(async (options: { config: string; output?: string }) => {
    const configPath = path.resolve(options.config);

    console.log(chalk.bold("\n  DocSpec Graph\n"));

    const spinner = ora("Building site data...").start();

    try {
      const { buildSite } = await import("@docspec/core");
      const siteData = await buildSite(configPath);
      spinner.succeed(`Generated ${siteData.pages.length} pages`);

      const dotSpinner = ora("Generating DOT graph...").start();
      const dot = generateDotGraph(siteData.pages);
      dotSpinner.succeed("DOT graph generated");

      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, dot, "utf-8");
        console.log(chalk.green(`\n  Written to: ${outputPath}\n`));
      } else {
        console.log("\n" + dot + "\n");
      }
    } catch (err) {
      spinner.fail(`Graph generation failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("diff")
  .description("Compare two docspec.json files")
  .argument("<before>", "Path to first docspec.json")
  .argument("<after>", "Path to second docspec.json")
  .action(async (before: string, after: string) => {
    console.log(chalk.bold("\n  DocSpec Diff\n"));

    try {
      const beforePath = path.resolve(before);
      const afterPath = path.resolve(after);

      const result = runDiff(beforePath, afterPath);
      const output = formatDiff(result);

      console.log(output);
      console.log("");
    } catch (err) {
      console.error(chalk.red(`Diff failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("export")
  .description("Export documentation to other formats")
  .option("-c, --config <path>", "Config file path", "docspec.config.yaml")
  .option("-f, --format <format>", "Output format (openapi|markdown)", "openapi")
  .option("-o, --output <file>", "Output file")
  .action(async (options: { config: string; format: string; output?: string }) => {
    const configPath = path.resolve(options.config);

    console.log(chalk.bold("\n  DocSpec Export\n"));

    const spinner = ora("Building site data...").start();

    try {
      const { buildSite } = await import("@docspec/core");
      const siteData = await buildSite(configPath);
      spinner.succeed(`Generated ${siteData.pages.length} pages`);

      if (options.format === "openapi") {
        const exportSpinner = ora("Generating OpenAPI spec...").start();
        const openapi = generateOpenAPI(siteData.pages, siteData.config.siteName, "1.0.0");
        const json = JSON.stringify(openapi, null, 2);
        exportSpinner.succeed("OpenAPI 3.1.0 spec generated");

        if (options.output) {
          const outputPath = path.resolve(options.output);
          await fs.writeFile(outputPath, json, "utf-8");
          console.log(chalk.green(`\n  Written to: ${outputPath}\n`));
        } else {
          console.log("\n" + json + "\n");
        }
      } else {
        console.error(chalk.red(`Unsupported format: ${options.format}`));
        process.exit(1);
      }
    } catch (err) {
      spinner.fail(`Export failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("test-report")
  .description("Generate HTML test coverage report from intent-graph.json")
  .argument("<intent-graph>", "Path to intent-graph.json")
  .option("-o, --output <file>", "Output file", "test-report.html")
  .action(async (intentGraph: string, options: { output: string }) => {
    console.log(chalk.bold("\n  DocSpec Test Report\n"));

    try {
      const intentGraphPath = path.resolve(intentGraph);
      const spinner = ora("Generating test report...").start();
      const html = generateTestReport(intentGraphPath);
      spinner.succeed("Test report generated");

      const outputPath = path.resolve(options.output);
      await fs.writeFile(outputPath, html, "utf-8");
      console.log(chalk.green(`\n  Written to: ${outputPath}\n`));
    } catch (err) {
      console.error(chalk.red(`Test report failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
