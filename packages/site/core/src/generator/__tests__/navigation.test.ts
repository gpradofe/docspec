import { describe, it, expect } from 'vitest';
import { buildNavigation } from '../navigation.js';
import { PageType } from '../../types/page.js';
import type { ResolvedArtifact } from '../../resolver/types.js';
import type { GeneratedPage } from '../../types/page.js';
import type { NavigationSection } from '../../types/config.js';
import type { DocSpec } from '../../types/docspec.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifact(label: string, moduleIds: string[]): ResolvedArtifact {
  const spec: DocSpec = {
    docspec: '3.0.0',
    artifact: {
      groupId: 'com.example',
      artifactId: label.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      language: 'java',
    },
    modules: moduleIds.map((id) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      members: [],
    })),
  };
  return { label, source: 'local', spec };
}

function makePage(
  type: PageType,
  title: string,
  slug: string,
  artifactLabel?: string,
): GeneratedPage {
  return {
    type,
    slug,
    title,
    artifactLabel,
    data: {} as GeneratedPage['data'],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildNavigation', () => {
  // ── Default sections ───────────────────────────────────────────────

  it('generates default sections when no navigation config is provided', () => {
    const artifacts = [makeArtifact('My Library', ['core', 'utils'])];
    const pages: GeneratedPage[] = [];

    const nav = buildNavigation(undefined, artifacts, pages);

    expect(nav.sections).toHaveLength(4);
    expect(nav.sections.map((s) => s.title)).toEqual([
      'Libraries',
      'API',
      'Architecture',
      'Learn',
    ]);
  });

  // ── Libraries auto-generation ─────────────────────────────────────

  it('auto-generates Libraries section with artifact and module entries', () => {
    const artifacts = [makeArtifact('My Library', ['core', 'utils'])];
    const pages: GeneratedPage[] = [];
    const config: NavigationSection[] = [
      { section: 'Libraries', auto: true },
    ];

    const nav = buildNavigation(config, artifacts, pages);

    expect(nav.sections).toHaveLength(1);
    const libSection = nav.sections[0];
    expect(libSection.title).toBe('Libraries');
    expect(libSection.items).toHaveLength(1);

    const artifactNode = libSection.items[0];
    expect(artifactNode.label).toBe('My Library');
    expect(artifactNode.slug).toBe('/libraries/my-library');
    expect(artifactNode.type).toBe(PageType.LANDING);
    expect(artifactNode.children).toHaveLength(2);
    expect(artifactNode.children![0].label).toBe('Core');
    expect(artifactNode.children![0].type).toBe(PageType.MODULE);
    expect(artifactNode.children![1].label).toBe('Utils');
  });

  // ── API auto-generation ───────────────────────────────────────────

  it('auto-generates API section from endpoint pages grouped by artifact', () => {
    const artifacts = [makeArtifact('Test API', ['api'])];
    const pages: GeneratedPage[] = [
      makePage(
        PageType.ENDPOINT,
        'GET /api/users',
        '/api/test-api/endpoints/get-api-users',
        'Test API',
      ),
      makePage(
        PageType.ENDPOINT,
        'POST /api/users',
        '/api/test-api/endpoints/post-api-users',
        'Test API',
      ),
    ];
    const config: NavigationSection[] = [{ section: 'API', auto: true }];

    const nav = buildNavigation(config, artifacts, pages);

    const apiSection = nav.sections[0];
    expect(apiSection.title).toBe('API');
    expect(apiSection.items).toHaveLength(1);
    expect(apiSection.items[0].label).toBe('Test API');
    expect(apiSection.items[0].children).toHaveLength(2);
    expect(apiSection.items[0].children![0].label).toBe('GET /api/users');
    expect(apiSection.items[0].children![1].label).toBe('POST /api/users');
  });

  // ── Architecture auto-generation ──────────────────────────────────

  it('auto-generates Architecture section with flows and error catalog', () => {
    const artifacts: ResolvedArtifact[] = [];
    const pages: GeneratedPage[] = [
      makePage(PageType.FLOW, 'User Registration', '/architecture/flows/user-registration'),
      makePage(PageType.ERROR_CATALOG, 'Error Catalog', '/architecture/errors'),
      makePage(PageType.GRAPH, 'Dependency Graph', '/architecture/graph'),
    ];
    const config: NavigationSection[] = [
      { section: 'Architecture', auto: true },
    ];

    const nav = buildNavigation(config, artifacts, pages);

    const archSection = nav.sections[0];
    expect(archSection.title).toBe('Architecture');

    const labels = archSection.items.map((i) => i.label);
    expect(labels).toContain('Flows');
    expect(labels).toContain('Error Catalog');
    expect(labels).toContain('Dependency Graph');

    // Flows should be a group with children
    const flowsNode = archSection.items.find((i) => i.label === 'Flows');
    expect(flowsNode).toBeDefined();
    expect(flowsNode!.children).toHaveLength(1);
    expect(flowsNode!.children![0].label).toBe('User Registration');
  });

  it('includes data models in Architecture section', () => {
    const pages: GeneratedPage[] = [
      makePage(PageType.DATA_MODEL, 'User', '/architecture/data-models/user'),
      makePage(PageType.DATA_MODEL, 'Order', '/architecture/data-models/order'),
    ];
    const config: NavigationSection[] = [
      { section: 'Architecture', auto: true },
    ];

    const nav = buildNavigation(config, [], pages);
    const archSection = nav.sections[0];
    const dmNode = archSection.items.find((i) => i.label === 'Data Models');
    expect(dmNode).toBeDefined();
    expect(dmNode!.children).toHaveLength(2);
  });

  // ── Learn auto-generation ─────────────────────────────────────────

  it('auto-generates Learn section from guide pages', () => {
    const pages: GeneratedPage[] = [
      makePage(PageType.GUIDE, 'Getting Started', '/learn/guides/getting-started'),
      makePage(PageType.GUIDE, 'Advanced Usage', '/learn/guides/advanced-usage'),
    ];
    const config: NavigationSection[] = [{ section: 'Learn', auto: true }];

    const nav = buildNavigation(config, [], pages);
    const learnSection = nav.sections[0];

    expect(learnSection.items).toHaveLength(2);
    expect(learnSection.items[0].label).toBe('Getting Started');
    expect(learnSection.items[0].type).toBe(PageType.GUIDE);
    expect(learnSection.items[1].label).toBe('Advanced Usage');
  });

  // ── Explicit items ────────────────────────────────────────────────

  it('resolves explicit items by slug', () => {
    const pages: GeneratedPage[] = [
      makePage(PageType.GUIDE, 'Getting Started', '/learn/guides/getting-started'),
    ];
    const config: NavigationSection[] = [
      {
        section: 'Guides',
        items: ['/learn/guides/getting-started'],
      },
    ];

    const nav = buildNavigation(config, [], pages);
    const section = nav.sections[0];

    expect(section.items).toHaveLength(1);
    expect(section.items[0].label).toBe('Getting Started');
    expect(section.items[0].slug).toBe('/learn/guides/getting-started');
  });

  it('resolves explicit items by title (case-insensitive)', () => {
    const pages: GeneratedPage[] = [
      makePage(PageType.GUIDE, 'Getting Started', '/learn/guides/getting-started'),
    ];
    const config: NavigationSection[] = [
      {
        section: 'Guides',
        items: ['getting started'],
      },
    ];

    const nav = buildNavigation(config, [], pages);
    const section = nav.sections[0];

    expect(section.items[0].label).toBe('Getting Started');
    expect(section.items[0].slug).toBe('/learn/guides/getting-started');
  });

  it('creates a label-only node for unresolved explicit items', () => {
    const pages: GeneratedPage[] = [];
    const config: NavigationSection[] = [
      { section: 'Guides', items: ['Coming Soon'] },
    ];

    const nav = buildNavigation(config, [], pages);
    const section = nav.sections[0];

    expect(section.items).toHaveLength(1);
    expect(section.items[0].label).toBe('Coming Soon');
    expect(section.items[0].slug).toBeUndefined();
  });

  // ── Empty state ───────────────────────────────────────────────────

  it('returns empty items for a section with no auto and no items', () => {
    const config: NavigationSection[] = [{ section: 'Custom' }];

    const nav = buildNavigation(config, [], []);
    expect(nav.sections[0].items).toHaveLength(0);
  });

  // ── Multiple artifacts ────────────────────────────────────────────

  it('includes all artifacts in the Libraries section', () => {
    const artifacts = [
      makeArtifact('Library A', ['core']),
      makeArtifact('Library B', ['utils', 'data']),
    ];
    const config: NavigationSection[] = [
      { section: 'Libraries', auto: true },
    ];

    const nav = buildNavigation(config, artifacts, []);
    const libSection = nav.sections[0];

    expect(libSection.items).toHaveLength(2);
    expect(libSection.items[0].label).toBe('Library A');
    expect(libSection.items[0].children).toHaveLength(1);
    expect(libSection.items[1].label).toBe('Library B');
    expect(libSection.items[1].children).toHaveLength(2);
  });
});
