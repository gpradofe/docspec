// @docspec:module {
//   id: "docspec-ts-tsdoc-reader",
//   name: "TSDoc Reader",
//   description: "Extracts documentation metadata from JSDoc/TSDoc comments on TypeScript AST nodes. Parses @param, @returns, @deprecated, @since, and @tag annotations into a structured TSDocMeta object.",
//   since: "3.0.0"
// }

import ts from "typescript";

export interface TSDocMeta {
  description?: string;
  params?: Map<string, string>;
  returns?: string;
  tags?: string[];
  deprecated?: string;
  since?: string;
}

export class TSDocReader {
  /** @docspec:intentional "Extracts documentation metadata from JSDoc/TSDoc comments including @param, @returns, @deprecated, and @since tags" */
  read(node: ts.Node, sourceFile: ts.SourceFile): TSDocMeta {
    const result: TSDocMeta = {};
    const jsdoc = (node as any).jsDoc as ts.JSDoc[] | undefined;
    if (!jsdoc || jsdoc.length === 0) return result;

    const doc = jsdoc[0];
    if (doc.comment) {
      result.description = typeof doc.comment === "string" ? doc.comment : doc.comment.map(c => c.text ?? "").join("");
    }

    if (doc.tags) {
      for (const tag of doc.tags) {
        const tagName = tag.tagName.text;
        const tagComment = tag.comment ? (typeof tag.comment === "string" ? tag.comment : tag.comment.map(c => c.text ?? "").join("")) : undefined;

        if (tagName === "param" && ts.isJSDocParameterTag(tag)) {
          if (!result.params) result.params = new Map();
          const paramName = tag.name.getText(sourceFile);
          if (tagComment) result.params.set(paramName, tagComment);
        } else if (tagName === "returns" || tagName === "return") {
          result.returns = tagComment;
        } else if (tagName === "deprecated") {
          result.deprecated = tagComment ?? "";
        } else if (tagName === "since") {
          result.since = tagComment;
        } else if (tagName === "tag" && tagComment) {
          if (!result.tags) result.tags = [];
          result.tags.push(tagComment);
        }
      }
    }

    return result;
  }

  /** @docspec:intentional "Extracts documentation metadata from a class member's JSDoc comments" */
  readMember(node: ts.Node, sourceFile: ts.SourceFile): TSDocMeta {
    return this.read(node, sourceFile);
  }
}
