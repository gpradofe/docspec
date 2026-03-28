/**
 * Import Javadoc HTML output into DocSpec format.
 */
export interface JavadocImportOptions {
  inputDir: string;
}

export async function importJavadoc(options: JavadocImportOptions): Promise<any> {
  throw new Error("javadoc import: not yet implemented");
}
