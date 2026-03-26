/**
 * create-docspec-site
 *
 * CLI scaffolder that creates a new DocSpec documentation site
 * with sensible defaults and a ready-to-run project structure.
 */

import { Command } from "commander";
import { scaffold } from "./scaffold.js";

const program = new Command();

program
  .name("create-docspec-site")
  .description("Scaffold a new DocSpec documentation site")
  .argument("[project-name]", "name of the project directory", "my-docs")
  .option(
    "--template <template>",
    "project template to use",
    "default",
  )
  .action(async (projectName: string, options: { template: string }) => {
    await scaffold(projectName, options.template);
  });

program.parse();
