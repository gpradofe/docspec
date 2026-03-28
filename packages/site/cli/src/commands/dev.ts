import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import chalk from "chalk";
import ora from "ora";
import { buildSite } from "@docspec/core";

interface DevOptions {
  config: string;
  port: string;
}

export async function devCommand(options: DevOptions) {
  const configPath = path.resolve(options.config);

  console.log(chalk.bold("\n  DocSpec Dev Server\n"));

  // 1. Run the pipeline
  const spinner = ora("Loading configuration...").start();

  try {
    const siteData = await buildSite(configPath);
    spinner.succeed(`Resolved ${siteData.pages.length} pages`);

    // 2. Write site-data.json for the Next.js app
    const cacheDir = path.join(path.dirname(configPath), ".docspec-cache");
    await fs.mkdir(cacheDir, { recursive: true });

    const siteDataPath = path.join(cacheDir, "site-data.json");
    await fs.writeFile(siteDataPath, JSON.stringify(siteData, null, 2));

    spinner.succeed(`Site data written to ${siteDataPath}`);

    // 3. Start Next.js dev server
    console.log(chalk.cyan(`\n  Starting dev server at http://localhost:${options.port}\n`));

    const appDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../app");

    const child = spawn("npx", ["next", "dev", "-p", options.port], {
      cwd: appDir,
      stdio: "inherit",
      env: {
        ...process.env,
        DOCSPEC_SITE_DATA: siteDataPath,
      },
      shell: true,
    });

    child.on("error", (err) => {
      console.error(chalk.red(`Failed to start dev server: ${err.message}`));
      process.exit(1);
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  } catch (err) {
    spinner.fail(`Pipeline failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
