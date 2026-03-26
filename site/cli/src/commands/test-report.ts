/**
 * Generate HTML test coverage report from intent-graph.json.
 */
import { readFileSync } from "fs";

export function generateTestReport(intentGraphPath: string): string {
  const data = JSON.parse(readFileSync(intentGraphPath, "utf-8"));
  const methods = data.methods ?? [];

  const html: string[] = [];
  html.push("<!DOCTYPE html>");
  html.push("<html><head><title>DocSpec Test Report</title>");
  html.push("<style>");
  html.push("body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }");
  html.push("table { width: 100%; border-collapse: collapse; }");
  html.push("th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }");
  html.push("th { background: #f5f5f5; }");
  html.push(".score-bar { height: 20px; border-radius: 4px; }");
  html.push(".high { background: #22c55e; }");
  html.push(".medium { background: #f59e0b; }");
  html.push(".low { background: #ef4444; }");
  html.push("</style></head><body>");
  html.push("<h1>DocSpec Test Intelligence Report</h1>");
  html.push(`<p>${methods.length} methods analyzed</p>`);
  html.push("<table><thead><tr><th>Method</th><th>ISD Score</th><th>Guards</th><th>Branches</th><th>Errors</th></tr></thead><tbody>");

  for (const method of methods) {
    const signals = method.intentSignals ?? {};
    const score = signals.intentDensityScore ?? 0;
    const scoreClass = score > 0.7 ? "high" : score > 0.4 ? "medium" : "low";
    const scorePercent = Math.round(score * 100);

    html.push("<tr>");
    html.push(`<td><code>${method.qualified}</code></td>`);
    html.push(`<td><div class="score-bar ${scoreClass}" style="width: ${scorePercent}%">&nbsp;${scorePercent}%</div></td>`);
    html.push(`<td>${signals.guardClauses ?? 0}</td>`);
    html.push(`<td>${signals.branches ?? 0}</td>`);
    html.push(`<td>${signals.errorHandling?.catchBlocks ?? 0}</td>`);
    html.push("</tr>");
  }

  html.push("</tbody></table></body></html>");
  return html.join("\n");
}
