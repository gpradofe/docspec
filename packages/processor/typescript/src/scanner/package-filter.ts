// @docspec:module {
//   id: "docspec-ts-package-filter",
//   name: "Package Filter",
//   description: "Filters discovered types by file path using include/exclude glob patterns. Normalizes backslashes to forward slashes for cross-platform support. Types matching any exclude pattern are rejected; types must match at least one include pattern if includes are specified.",
//   since: "3.0.0"
// }

/**
 * @docspec:boundary "Include/exclude filtering of discovered file paths"
 * @docspec:deterministic
 * @docspec:preserves "Exclude patterns always take precedence over include patterns"
 */
export class PackageFilter {
  private includes: RegExp[];
  private excludes: RegExp[];

  constructor(include: string[], exclude: string[]) {
    this.includes = include.map(p => new RegExp(p.replace(/\*/g, ".*")));
    this.excludes = exclude.map(p => new RegExp(p.replace(/\*/g, ".*")));
  }

  /** @docspec:deterministic */
  accept(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, "/");
    if (this.excludes.some(re => re.test(normalized))) return false;
    if (this.includes.length === 0) return true;
    return this.includes.some(re => re.test(normalized));
  }
}
