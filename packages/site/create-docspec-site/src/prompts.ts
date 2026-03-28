/**
 * Interactive CLI prompts for create-docspec-site.
 *
 * Uses @clack/prompts to collect project configuration
 * through a guided wizard experience.
 */

import * as p from '@clack/prompts';

export interface ProjectConfig {
  name: string;
  theme: string;
  languages: string[];
  hasArtifacts: boolean;
  artifacts: ArtifactConfig[];
  hasOpenApi: boolean;
  openApiPath?: string;
  enableDsti: boolean;
  llmOptions: string[];
  importRegistries: boolean;
  registrySource?: string;
}

export interface ArtifactConfig {
  type: 'maven' | 'npm' | 'crate' | 'pypi' | 'nuget' | 'local';
  label: string;
  // Maven
  groupId?: string;
  artifactId?: string;
  version?: string;
  // npm
  scope?: string;
  packageName?: string;
  // local
  path?: string;
  color?: string;
}

export async function runPrompts(initialName?: string): Promise<ProjectConfig | null> {
  p.intro('Create DocSpec Site');

  const basicInfo = await p.group({
    name: () => p.text({
      message: 'What is your project name?',
      placeholder: 'my-docs',
      initialValue: initialName || 'my-docs',
      validate: (v) => {
        if (!v.trim()) return 'Project name is required';
        if (/[^a-zA-Z0-9._-]/.test(v)) return 'Name can only contain alphanumeric characters, dots, hyphens, and underscores';
      },
    }),
    theme: () => p.select({
      message: 'What theme would you like?',
      options: [
        { value: 'stripe', label: 'Stripe', hint: 'clean, API-focused' },
        { value: 'dark', label: 'Dark', hint: 'code-forward' },
        { value: 'minimal', label: 'Minimal', hint: 'simple, single-column' },
      ],
    }) as Promise<string>,
    languages: () => p.multiselect({
      message: 'What languages does your project use?',
      options: [
        { value: 'java', label: 'Java' },
        { value: 'typescript', label: 'TypeScript' },
        { value: 'python', label: 'Python' },
        { value: 'rust', label: 'Rust' },
        { value: 'csharp', label: 'C#' },
        { value: 'go', label: 'Go' },
      ],
      required: true,
    }) as Promise<string[]>,
  }, {
    onCancel: () => { p.cancel('Setup cancelled.'); return process.exit(0); },
  });

  // Artifact configuration
  const hasArtifacts = await p.confirm({
    message: 'Do you have artifacts to document?',
    initialValue: true,
  });

  const artifacts: ArtifactConfig[] = [];
  if (hasArtifacts && !p.isCancel(hasArtifacts)) {
    let addMore = true;
    while (addMore) {
      const artifact = await collectArtifact(basicInfo.languages as string[]);
      if (artifact) artifacts.push(artifact);

      const more = await p.confirm({ message: 'Add another artifact?', initialValue: false });
      addMore = !p.isCancel(more) && more === true;
    }
  }

  // Registry import
  let importRegistries = false;
  let registrySource: string | undefined;
  if (artifacts.length > 0) {
    const hasPrivate = await p.confirm({
      message: 'Do you use private registries?',
      initialValue: false,
    });
    if (hasPrivate && !p.isCancel(hasPrivate)) {
      importRegistries = true;
      const source = await p.select({
        message: 'How should we resolve credentials?',
        options: [
          { value: 'settings-xml', label: 'Import from ~/.m2/settings.xml' },
          { value: 'npmrc', label: 'Import from ~/.npmrc' },
          { value: 'manual', label: 'Configure manually' },
          { value: 'env', label: 'Use environment variables' },
        ],
      });
      registrySource = p.isCancel(source) ? undefined : source as string;
    }
  }

  // OpenAPI
  const hasOpenApi = await p.confirm({
    message: 'Do you have an OpenAPI spec?',
    initialValue: false,
  });
  let openApiPath: string | undefined;
  if (hasOpenApi && !p.isCancel(hasOpenApi)) {
    const oaPath = await p.text({
      message: 'Path to OpenAPI spec:',
      placeholder: './specs/api.json',
    });
    openApiPath = p.isCancel(oaPath) ? undefined : oaPath;
  }

  // DSTI
  const enableDsti = await p.confirm({
    message: 'Enable DSTI test generation?',
    initialValue: true,
  });

  // LLM integration
  const llmOptions = await p.multiselect({
    message: 'Enable LLM integration?',
    options: [
      { value: 'llms-txt', label: 'Generate llms.txt', hint: 'for LLM consumption' },
      { value: 'claude-md', label: 'Generate CLAUDE.md', hint: 'for Claude Code' },
      { value: 'mcp-server', label: 'MCP Server', hint: 'for AI agents' },
      { value: 'embeddings', label: 'Embeddings', hint: 'for semantic search' },
    ],
    required: false,
  });

  return {
    name: basicInfo.name as string,
    theme: basicInfo.theme as string,
    languages: basicInfo.languages as string[],
    hasArtifacts: artifacts.length > 0,
    artifacts,
    hasOpenApi: !!openApiPath,
    openApiPath,
    enableDsti: !p.isCancel(enableDsti) && enableDsti === true,
    llmOptions: p.isCancel(llmOptions) ? [] : llmOptions as string[],
    importRegistries,
    registrySource,
  };
}

async function collectArtifact(languages: string[]): Promise<ArtifactConfig | null> {
  const hasJava = languages.includes('java');
  const hasTs = languages.includes('typescript');

  const type = await p.select({
    message: 'Artifact type:',
    options: [
      ...(hasJava ? [{ value: 'maven' as const, label: 'Maven (Java)' }] : []),
      ...(hasTs ? [{ value: 'npm' as const, label: 'npm (TypeScript/JavaScript)' }] : []),
      { value: 'local' as const, label: 'Local path (docspec.json)' },
      { value: 'crate' as const, label: 'Crate (Rust)' },
      { value: 'pypi' as const, label: 'PyPI (Python)' },
      { value: 'nuget' as const, label: 'NuGet (C#)' },
    ],
  });

  if (p.isCancel(type)) return null;

  if (type === 'maven') {
    const maven = await p.group({
      groupId: () => p.text({ message: 'Group ID:', placeholder: 'com.example' }),
      artifactId: () => p.text({ message: 'Artifact ID:', placeholder: 'my-library' }),
      version: () => p.text({ message: 'Version:', placeholder: '1.0.0' }),
      label: () => p.text({ message: 'Display label:', placeholder: 'My Library' }),
      color: () => p.text({ message: 'Theme color (hex):', placeholder: '#6366f1', initialValue: '#6366f1' }),
    });
    return { type: 'maven', ...maven } as ArtifactConfig;
  }

  if (type === 'npm') {
    const npm = await p.group({
      packageName: () => p.text({ message: 'Package name:', placeholder: '@scope/package' }),
      version: () => p.text({ message: 'Version:', placeholder: 'latest' }),
      label: () => p.text({ message: 'Display label:', placeholder: 'My Package' }),
      color: () => p.text({ message: 'Theme color (hex):', placeholder: '#6366f1', initialValue: '#6366f1' }),
    });
    return { type: 'npm', ...npm } as ArtifactConfig;
  }

  if (type === 'local') {
    const local = await p.group({
      path: () => p.text({ message: 'Path to docspec.json:', placeholder: './path/to/docspec.json' }),
      label: () => p.text({ message: 'Display label:', placeholder: 'My Library' }),
      color: () => p.text({ message: 'Theme color (hex):', placeholder: '#6366f1', initialValue: '#6366f1' }),
    });
    return { type: 'local', ...local } as ArtifactConfig;
  }

  // Generic for crate/pypi/nuget
  const generic = await p.group({
    packageName: () => p.text({ message: 'Package name:', placeholder: 'my-package' }),
    version: () => p.text({ message: 'Version:', placeholder: 'latest' }),
    label: () => p.text({ message: 'Display label:', placeholder: 'My Package' }),
    color: () => p.text({ message: 'Theme color (hex):', placeholder: '#6366f1', initialValue: '#6366f1' }),
  });
  return { type: type as ArtifactConfig['type'], ...generic } as ArtifactConfig;
}
