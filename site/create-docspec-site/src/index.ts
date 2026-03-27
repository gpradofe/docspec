#!/usr/bin/env node

/**
 * create-docspec-site
 *
 * Interactive CLI scaffolder that creates a new DocSpec documentation site
 * with a fully populated configuration and starter docs.
 */

import { runPrompts } from "./prompts.js";
import { scaffold } from "./scaffold.js";
import * as p from '@clack/prompts';

async function main() {
  const args = process.argv.slice(2);
  const projectName = args.find(a => !a.startsWith('-'));

  const config = await runPrompts(projectName);
  if (!config) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const s = p.spinner();
  s.start('Creating project...');
  await scaffold(config);
  s.stop('Project created!');

  p.note([
    `cd ${config.name}`,
    'npm install',
    'npx docspec dev',
  ].join('\n'), 'Next steps');

  const features: string[] = [];
  if (config.artifacts.length > 0) features.push(`${config.artifacts.length} artifact(s)`);
  if (config.hasOpenApi) features.push('OpenAPI integration');
  if (config.enableDsti) features.push('DSTI test generation');
  if (config.llmOptions.length > 0) features.push(`LLM: ${config.llmOptions.join(', ')}`);

  if (features.length > 0) {
    p.note(features.join('\n'), 'Your site includes');
  }

  p.outro('Your DocSpec site is ready!');
}

main().catch(console.error);
