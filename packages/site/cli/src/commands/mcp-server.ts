import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { buildSite, DocSpecMCPServer } from "@docspec/core";

interface MCPServerOptions {
  config: string;
}

export async function mcpServerCommand(options: MCPServerOptions) {
  const configPath = path.resolve(options.config);

  // Log to stderr so stdout stays clean for JSON-RPC
  const log = (msg: string) => process.stderr.write(msg + "\n");

  log(chalk.bold("\n  DocSpec MCP Server\n"));

  const spinner = ora({ stream: process.stderr, text: "Building site data..." }).start();

  try {
    const siteData = await buildSite(configPath);
    spinner.succeed(`Loaded ${siteData.pages.length} pages`);

    log(chalk.dim("  Starting MCP server on stdio..."));
    log(chalk.dim("  Send JSON-RPC messages via stdin, responses on stdout.\n"));

    const server = new DocSpecMCPServer(siteData);
    await server.startStdio();
  } catch (err) {
    spinner.fail(`MCP server failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
