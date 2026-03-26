import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { loadConfig, resolveArtifacts } from "@docspec/core";

interface ResolveOptions {
  config: string;
}

export async function resolveCommand(options: ResolveOptions) {
  const configPath = path.resolve(options.config);
  const configDir = path.dirname(configPath);

  console.log(chalk.bold("\n  DocSpec Resolve\n"));

  const spinner = ora("Loading configuration...").start();

  try {
    const config = await loadConfig(configPath);
    spinner.succeed(`Loaded config with ${config.artifacts?.length || 0} artifact(s)`);

    const resolveSpinner = ora("Resolving artifacts...").start();

    const cacheDir = config.build?.cacheDir || "./.docspec-cache";
    const artifacts = await resolveArtifacts(
      config.artifacts || [],
      cacheDir,
      configDir
    );

    resolveSpinner.succeed(`Resolved ${artifacts.length} artifact(s)`);

    for (const art of artifacts) {
      const spec = art.spec;
      const moduleCount = spec.modules.length;
      let memberCount = 0;
      for (const mod of spec.modules) {
        memberCount += mod.members?.length || 0;
      }

      console.log(
        `  ${chalk.cyan(art.label)} (${art.source}) — ${moduleCount} modules, ${memberCount} classes`
      );
    }

    console.log("");
  } catch (err) {
    spinner.fail(`Resolve failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
