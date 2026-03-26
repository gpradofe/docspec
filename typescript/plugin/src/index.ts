// @docspec:module {
//   id: "docspec-ts-plugin-cli",
//   name: "DocSpec TypeScript CLI Entry Point",
//   description: "Main CLI entry point for the docspec-ts command. Dispatches to generate, generate-tests, validate, or help subcommands based on the first argv argument.",
//   since: "3.0.0"
// }

import { generate } from "./generate.js";
import { loadConfig, type DocSpecTSConfig } from "./config.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const config = await loadConfig();

  switch (command) {
    case "generate":
      await generate(config);
      break;
    case "generate-tests":
      console.log("Test generation coming soon...");
      break;
    case "validate":
      console.log("Validation coming soon...");
      break;
    case "help":
    default:
      printUsage();
      break;
  }
}

function printUsage(): void {
  console.log(`
docspec-ts — DocSpec TypeScript CLI

Usage:
  docspec-ts generate          Generate docspec.json from TypeScript source
  docspec-ts generate-tests    Generate test stubs from intent graph
  docspec-ts validate          Validate docspec.json against schema
  docspec-ts help              Show this help message

Options:
  --config <path>    Path to docspec.config.yaml (default: ./docspec.config.yaml)
  --output <dir>     Output directory (default: ./target)
`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
