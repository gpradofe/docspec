import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGS = [
  'java', 'typescript', 'javascript', 'python', 'rust', 'go', 'csharp',
  'bash', 'shell', 'json', 'yaml', 'xml', 'sql', 'graphql',
  'tsx', 'jsx', 'toml', 'properties', 'http',
] as const;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: [...SUPPORTED_LANGS],
    });
  }
  return highlighterPromise;
}
