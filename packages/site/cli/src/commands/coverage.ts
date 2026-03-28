import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { loadConfig, resolveArtifacts } from "@docspec/core";

interface CoverageOptions {
  config: string;
}

export async function coverageCommand(options: CoverageOptions) {
  const configPath = path.resolve(options.config);
  const configDir = path.dirname(configPath);

  console.log(chalk.bold("\n  DocSpec Coverage Report\n"));

  const spinner = ora("Loading...").start();

  try {
    const config = await loadConfig(configPath);

    const cacheDir = config.build?.cacheDir || "./.docspec-cache";
    const artifacts = await resolveArtifacts(
      config.artifacts || [],
      cacheDir,
      configDir
    );

    spinner.stop();

    let totalClasses = 0;
    let documentedClasses = 0;

    for (const art of artifacts) {
      const disc = art.spec.discovery;
      const coverage = disc?.coveragePercent ?? 0;
      const classes = disc?.documentedClasses ?? 0;
      const total = disc?.totalClasses ?? 0;

      totalClasses += total;
      documentedClasses += classes;

      const bar = renderBar(coverage);
      const color = coverage >= 80 ? chalk.green : coverage >= 50 ? chalk.yellow : chalk.red;

      console.log(`  ${chalk.cyan(art.label.padEnd(30))} ${bar} ${color(`${coverage.toFixed(1)}%`)}`);

      if (disc) {
        console.log(
          chalk.gray(`    Classes: ${classes}/${total}  Methods: ${disc.totalMethods ?? "?"}  Params: ${disc.documentedParams ?? "?"}/${disc.totalParams ?? "?"}`)
        );
      }
    }

    const overallCoverage = totalClasses > 0 ? (documentedClasses / totalClasses) * 100 : 0;
    console.log(
      `\n  ${chalk.bold("Overall".padEnd(30))} ${renderBar(overallCoverage)} ${chalk.bold(`${overallCoverage.toFixed(1)}%`)}\n`
    );
  } catch (err) {
    spinner.fail(`Coverage report failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

function renderBar(percent: number): string {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}
