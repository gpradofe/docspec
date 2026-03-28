import path from "node:path";
import fs from "node:fs/promises";
import chalk from "chalk";
import ora from "ora";
import { buildSite, generateLlmsTxt, generateLlmsFullTxt } from "@docspec/core";

interface ContextOptions {
  config: string;
  output: string;
}

export async function contextCommand(options: ContextOptions) {
  const configPath = path.resolve(options.config);
  const outputDir = path.resolve(options.output);

  console.log(chalk.bold("\n  DocSpec Context (llms.txt)\n"));

  const spinner = ora("Building site data...").start();

  try {
    const siteData = await buildSite(configPath);
    spinner.succeed(`Generated ${siteData.pages.length} pages`);

    // Generate llms.txt (concise)
    const llmsTxtSpinner = ora("Generating llms.txt...").start();
    const llmsTxt = generateLlmsTxt(siteData.pages, siteData.config.siteName);
    const llmsTxtPath = path.join(outputDir, "llms.txt");
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(llmsTxtPath, llmsTxt, "utf-8");
    llmsTxtSpinner.succeed(`llms.txt written (${(Buffer.byteLength(llmsTxt) / 1024).toFixed(1)} KB)`);

    // Generate llms-full.txt (comprehensive)
    const fullSpinner = ora("Generating llms-full.txt...").start();
    const llmsFullTxt = generateLlmsFullTxt(siteData.pages, siteData.config.siteName);
    const llmsFullTxtPath = path.join(outputDir, "llms-full.txt");
    await fs.writeFile(llmsFullTxtPath, llmsFullTxt, "utf-8");
    fullSpinner.succeed(`llms-full.txt written (${(Buffer.byteLength(llmsFullTxt) / 1024).toFixed(1)} KB)`);

    console.log(chalk.green(`\n  Output directory: ${outputDir}`));
    console.log(chalk.dim(`    llms.txt       — concise summary for LLMs`));
    console.log(chalk.dim(`    llms-full.txt  — comprehensive dump for LLMs\n`));
  } catch (err) {
    spinner.fail(`Context generation failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
