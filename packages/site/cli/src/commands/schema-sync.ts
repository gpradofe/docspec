import * as fs from "node:fs";
import * as path from "node:path";

export interface SchemaSyncOptions {
  specFile?: string;
  schemaFile?: string;
}

export async function schemaSync(options: SchemaSyncOptions): Promise<void> {
  const specFile = options.specFile ?? "target/docspec.json";
  const schemaFile = options.schemaFile ?? "spec/docspec.schema.json";

  console.log("DocSpec: Validating schema sync...");

  if (!fs.existsSync(specFile)) {
    throw new Error(`Spec file not found: ${specFile}`);
  }

  const spec = JSON.parse(fs.readFileSync(specFile, "utf-8"));
  const dataModels = spec.dataModels ?? [];
  const dataStores = spec.dataStores ?? [];

  const issues: string[] = [];

  // Check data models have table mappings
  for (const dm of dataModels) {
    if (!dm.table) {
      issues.push(`Data model ${dm.qualified ?? dm.name} has no table mapping.`);
    }
    for (const field of dm.fields ?? []) {
      if (!field.type) {
        issues.push(`Field ${dm.name}.${field.name} has no type.`);
      }
    }
  }

  // Check data stores have consistent schema
  for (const ds of dataStores) {
    if (ds.type === "rdbms" && (!ds.tables || ds.tables.length === 0)) {
      issues.push(`RDBMS store ${ds.id} has no tables listed.`);
    }
  }

  if (issues.length === 0) {
    console.log("DocSpec: Schema sync check passed.");
  } else {
    console.log(`DocSpec: Found ${issues.length} schema sync issue(s):`);
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
    process.exitCode = 1;
  }
}
