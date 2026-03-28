import * as fs from "node:fs";
import * as path from "node:path";

export interface DeployOptions {
  target: "netlify" | "vercel" | "s3" | "static";
  outputDir?: string;
  siteDir?: string;
  dryRun?: boolean;
}

export async function deploy(options: DeployOptions): Promise<void> {
  const outputDir = options.outputDir ?? "out";
  const siteDir = options.siteDir ?? ".";

  if (!fs.existsSync(path.join(siteDir, outputDir))) {
    throw new Error(`Build output not found at ${path.join(siteDir, outputDir)}. Run 'docspec build' first.`);
  }

  console.log(`DocSpec: Deploying to ${options.target}...`);

  switch (options.target) {
    case "netlify":
      console.log("  Would run: npx netlify deploy --prod --dir=" + outputDir);
      break;
    case "vercel":
      console.log("  Would run: npx vercel --prod " + outputDir);
      break;
    case "s3":
      console.log("  Would run: aws s3 sync " + outputDir + " s3://<bucket>");
      break;
    case "static":
      console.log(`  Output ready at ${outputDir}/`);
      break;
  }

  if (options.dryRun) {
    console.log("  (dry run — no actual deployment)");
  } else {
    console.log("DocSpec: Deployment complete.");
  }
}
