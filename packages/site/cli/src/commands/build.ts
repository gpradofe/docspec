import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import { buildSite } from "@docspec/core";

interface BuildOptions {
  config: string;
  output?: string;
}

export async function buildCommand(options: BuildOptions) {
  const configPath = path.resolve(options.config);

  console.log(chalk.bold("\n  DocSpec Build\n"));

  // 1. Run the pipeline
  const spinner = ora("Building site data...").start();

  try {
    const siteData = await buildSite(configPath);
    spinner.succeed(`Generated ${siteData.pages.length} pages`);

    // 2. Write site-data.json
    const cacheDir = path.join(path.dirname(configPath), ".docspec-cache");
    await fs.mkdir(cacheDir, { recursive: true });

    const siteDataPath = path.join(cacheDir, "site-data.json");
    await fs.writeFile(siteDataPath, JSON.stringify(siteData, null, 2));

    // 3. Run Next.js build
    const buildSpinner = ora("Building static site...").start();

    const appDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../app");

    await new Promise<void>((resolve, reject) => {
      const child = spawn("npx", ["next", "build"], {
        cwd: appDir,
        stdio: "pipe",
        env: {
          ...process.env,
          DOCSPEC_SITE_DATA: siteDataPath,
        },
        shell: true,
      });

      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Next.js build exited with code ${code}`));
      });
    });

    buildSpinner.succeed("Static site built");

    // 4. Copy output
    const outputDir = options.output || path.join(path.dirname(configPath), "out");
    const nextOutDir = path.join(appDir, "out");

    try {
      await fs.cp(nextOutDir, outputDir, { recursive: true });
      console.log(chalk.green(`\n  Output: ${outputDir}\n`));
    } catch {
      console.log(chalk.yellow(`\n  Output available at: ${nextOutDir}\n`));
    }
  } catch (err) {
    spinner.fail(`Build failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
