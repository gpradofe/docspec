import Markdoc, { type Config, type Schema } from '@markdoc/markdoc';

const callout: Schema = {
  render: 'Callout',
  attributes: {
    type: { type: String, default: 'note', matches: ['note', 'warning', 'tip', 'danger'] },
    title: { type: String },
  },
};

const heading: Schema = {
  render: 'Heading',
  children: ['inline'],
  attributes: {
    id: { type: String },
    level: { type: Number, required: true },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const children = node.transformChildren(config);
    const text = children.filter((c: any) => typeof c === 'string').join(' ');
    const id = attributes.id || text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return new Markdoc.Tag('Heading', { ...attributes, id, level: node.attributes.level }, children);
  },
};

export const markdocConfig: Config = {
  tags: {
    callout,
  },
  nodes: {
    heading,
    fence: {
      render: 'CodeBlock',
      attributes: {
        language: { type: String },
        content: { type: String },
      },
    },
  },
};

export function parseMarkdoc(content: string) {
  const ast = Markdoc.parse(content);
  const transformed = Markdoc.transform(ast, markdocConfig);
  return transformed;
}

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export function extractToc(content: string): TocEntry[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const entries: TocEntry[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    entries.push({ id, text, level });
  }
  return entries;
}
