import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { loadConfig, resolveArtifacts } from "@docspec/core";

interface ValidateOptions {
  config: string;
}

export async function validateCommand(options: ValidateOptions) {
  const configPath = path.resolve(options.config);
  const configDir = path.dirname(configPath);

  console.log(chalk.bold("\n  DocSpec Validate\n"));

  const spinner = ora("Validating...").start();

  try {
    const config = await loadConfig(configPath);

    const cacheDir = config.build?.cacheDir || "./.docspec-cache";
    const artifacts = await resolveArtifacts(
      config.artifacts || [],
      cacheDir,
      configDir
    );

    let valid = true;

    for (const art of artifacts) {
      const spec = art.spec;

      // Basic validation checks
      if (!spec.docspec || spec.docspec !== "3.0.0") {
        console.log(chalk.red(`  ✗ ${art.label}: invalid docspec version "${spec.docspec}"`));
        valid = false;
        continue;
      }

      if (!spec.artifact || !spec.artifact.groupId) {
        console.log(chalk.red(`  ✗ ${art.label}: missing artifact.groupId`));
        valid = false;
        continue;
      }

      if (!spec.modules || spec.modules.length === 0) {
        console.log(chalk.yellow(`  ⚠ ${art.label}: no modules found`));
      }

      console.log(chalk.green(`  ✓ ${art.label}: valid`));
    }

    spinner.stop();

    if (valid) {
      console.log(chalk.green("\n  All artifacts valid\n"));
    } else {
      console.log(chalk.red("\n  Validation failed\n"));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(`Validation failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
