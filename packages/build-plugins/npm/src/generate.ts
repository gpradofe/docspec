// @docspec:module {
//   id: "docspec-ts-plugin-generate",
//   name: "Plugin Generate Command",
//   description: "Implements the 'docspec-ts generate' command. Instantiates the DocSpecTSProcessor with resolved configuration, runs the full processing pipeline, serializes output to docspec.json, and prints a summary of discovered modules, members, and intent methods.",
//   since: "3.0.0"
// }

import { DocSpecTSProcessor } from "@docspec/processor-ts";
import { Serializer } from "@docspec/processor-ts";
import type { DocSpecTSConfig } from "./config.js";

export async function generate(config: DocSpecTSConfig): Promise<void> {
  console.log("DocSpec: Generating specification from TypeScript source...");

  const processor = new DocSpecTSProcessor({
    tsConfigPath: config.tsConfigPath ?? "tsconfig.json",
    include: config.include,
    exclude: config.exclude,
    outputDir: config.outputDir ?? "target",
    groupId: config.groupId ?? "unknown",
    artifactId: config.artifactId ?? "unknown",
    version: config.version ?? "0.0.0",
  });

  const output = processor.process();
  const serializer = new Serializer();
  serializer.write(output, config.outputDir ?? "target");

  const moduleCount = output.modules.length;
  const memberCount = output.modules.reduce((sum, m) => sum + (m.members?.length ?? 0), 0);
  const intentCount = output.intentGraph?.methods?.length ?? 0;

  console.log(`DocSpec: Generated specification`);
  console.log(`  Modules:  ${moduleCount}`);
  console.log(`  Members:  ${memberCount}`);
  console.log(`  Intent methods: ${intentCount}`);
  console.log(`  Output: ${config.outputDir ?? "target"}/docspec.json`);
}
