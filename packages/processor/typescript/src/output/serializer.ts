// @docspec:module {
//   id: "docspec-ts-serializer",
//   name: "DocSpec Output Serializer",
//   description: "Serializes the final DocSpec output to docspec.json and optionally intent-graph.json. Creates the output directory if it does not exist and writes formatted JSON files.",
//   since: "3.0.0"
// }

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @docspec:boundary "File system output for docspec.json and intent-graph.json"
 */
export class Serializer {
  /** @docspec:intentional "Writes docspec.json and optionally intent-graph.json to the output directory" */
  write(data: any, outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write docspec.json
    const specPath = path.join(outputDir, "docspec.json");
    fs.writeFileSync(specPath, JSON.stringify(data, null, 2), "utf-8");

    // Write intent-graph.json if present
    if (data.intentGraph) {
      const intentPath = path.join(outputDir, "intent-graph.json");
      const intentData = {
        docspec: data.docspec,
        artifact: { groupId: data.artifact.groupId, artifactId: data.artifact.artifactId, version: data.artifact.version },
        methods: data.intentGraph.methods,
      };
      fs.writeFileSync(intentPath, JSON.stringify(intentData, null, 2), "utf-8");
    }
  }
}
