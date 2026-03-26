import { describe, it, expect } from 'vitest';
import { buildReferenceIndex } from '../reference-index.js';
import { PageType } from '../../types/page.js';
import type {
  GeneratedPage,
  MemberPageData,
  DataModelPageData,
  EndpointPageData,
  FlowPageData,
  DataStorePageData,
  ConfigurationPageData,
  SecurityPageData,
} from '../../types/page.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMemberPage(
  name: string,
  qualified: string,
  slug: string,
): GeneratedPage {
  const data: MemberPageData = {
    type: PageType.MEMBER,
    member: { kind: 'class', name, qualified },
    moduleId: 'test-module',
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.MEMBER, slug, title: name, data };
}

function makeEndpointPage(
  method: string,
  path: string,
  slug: string,
): GeneratedPage {
  const data: EndpointPageData = {
    type: PageType.ENDPOINT,
    method: {
      name: 'handler',
      endpointMapping: { method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path },
    },
    memberQualified: 'com.example.Controller',
    memberName: 'Controller',
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.ENDPOINT, slug, title: `${method} ${path}`, data };
}

function makeDataModelPage(
  name: string,
  qualified: string,
  slug: string,
): GeneratedPage {
  const data: DataModelPageData = {
    type: PageType.DATA_MODEL,
    dataModel: { name, qualified },
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.DATA_MODEL, slug, title: name, data };
}

function makeFlowPage(title: string, slug: string): GeneratedPage {
  return {
    type: PageType.FLOW,
    slug,
    title,
    data: {
      type: PageType.FLOW,
      flow: { id: title.toLowerCase().replace(/\s+/g, '-'), steps: [] },
      artifact: { label: 'TestApp' },
    } as FlowPageData,
  };
}

function makeDataStorePage(
  stores: Array<{ id: string; name?: string }>,
  slug: string,
): GeneratedPage {
  const data: DataStorePageData = {
    type: PageType.DATA_STORE,
    dataStores: stores.map((s) => ({
      id: s.id,
      name: s.name,
      type: 'rdbms' as const,
    })),
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.DATA_STORE, slug, title: 'Data Stores', data };
}

function makeConfigurationPage(
  keys: string[],
  slug: string,
): GeneratedPage {
  const data: ConfigurationPageData = {
    type: PageType.CONFIGURATION,
    properties: keys.map((key) => ({ key })),
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.CONFIGURATION, slug, title: 'Configuration', data };
}

function makeSecurityPage(
  authMechanism: string,
  roles: string[],
  slug: string,
): GeneratedPage {
  const data: SecurityPageData = {
    type: PageType.SECURITY,
    security: { authMechanism, roles },
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.SECURITY, slug, title: 'Security', data };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildReferenceIndex', () => {
  // ── Member indexing ────────────────────────────────────────────────

  it('indexes member pages by qualified name', () => {
    const pages = [
      makeMemberPage('UserService', 'com.example.UserService', '/libs/test/members/com/example/userservice'),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['com.example.UserService']).toBe('/libs/test/members/com/example/userservice');
  });

  it('indexes member pages by simple name', () => {
    const pages = [
      makeMemberPage('UserService', 'com.example.UserService', '/libs/test/members/com/example/userservice'),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['UserService']).toBe('/libs/test/members/com/example/userservice');
  });

  it('indexes multiple members without collision', () => {
    const pages = [
      makeMemberPage('Foo', 'com.example.Foo', '/slug-foo'),
      makeMemberPage('Bar', 'com.example.Bar', '/slug-bar'),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['com.example.Foo']).toBe('/slug-foo');
    expect(index['Foo']).toBe('/slug-foo');
    expect(index['com.example.Bar']).toBe('/slug-bar');
    expect(index['Bar']).toBe('/slug-bar');
  });

  // ── Endpoint indexing ─────────────────────────────────────────────

  it('indexes endpoint pages by "METHOD /path"', () => {
    const pages = [
      makeEndpointPage('GET', '/api/users', '/api/test/endpoints/get-api-users'),
      makeEndpointPage('POST', '/api/users', '/api/test/endpoints/post-api-users'),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['GET /api/users']).toBe('/api/test/endpoints/get-api-users');
    expect(index['POST /api/users']).toBe('/api/test/endpoints/post-api-users');
  });

  it('does not index endpoints missing method or path', () => {
    const page: GeneratedPage = {
      type: PageType.ENDPOINT,
      slug: '/api/test/endpoints/broken',
      title: 'Broken',
      data: {
        type: PageType.ENDPOINT,
        method: {
          name: 'broken',
          endpointMapping: {},
        },
        memberQualified: 'com.example.Ctrl',
        memberName: 'Ctrl',
        artifact: { label: 'TestApp' },
      } as EndpointPageData,
    };

    const index = buildReferenceIndex([page]);

    // No key like "undefined undefined" should appear
    expect(Object.keys(index)).toHaveLength(0);
  });

  // ── Data model indexing ───────────────────────────────────────────

  it('indexes data model pages by qualified name and simple name', () => {
    const pages = [
      makeDataModelPage('User', 'com.example.User', '/architecture/data-models/user'),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['com.example.User']).toBe('/architecture/data-models/user');
    expect(index['User']).toBe('/architecture/data-models/user');
  });

  // ── Flow indexing ─────────────────────────────────────────────────

  it('indexes flow pages by title', () => {
    const pages = [
      makeFlowPage('User Registration', '/architecture/flows/user-registration'),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['User Registration']).toBe('/architecture/flows/user-registration');
  });

  // ── Data store indexing ───────────────────────────────────────────

  it('indexes data store pages by store id and name', () => {
    const pages = [
      makeDataStorePage(
        [
          { id: 'primary-db', name: 'Primary Database' },
          { id: 'redis-cache', name: 'Redis Cache' },
        ],
        '/architecture/data-stores',
      ),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['primary-db']).toBe('/architecture/data-stores');
    expect(index['Primary Database']).toBe('/architecture/data-stores');
    expect(index['redis-cache']).toBe('/architecture/data-stores');
    expect(index['Redis Cache']).toBe('/architecture/data-stores');
  });

  // ── Configuration indexing ────────────────────────────────────────

  it('indexes configuration pages by property key', () => {
    const pages = [
      makeConfigurationPage(
        ['app.max-retries', 'app.timeout-ms'],
        '/libs/test/configuration',
      ),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['app.max-retries']).toBe('/libs/test/configuration');
    expect(index['app.timeout-ms']).toBe('/libs/test/configuration');
  });

  // ── Security indexing ─────────────────────────────────────────────

  it('indexes security pages by auth mechanism and roles', () => {
    const pages = [
      makeSecurityPage('jwt', ['ADMIN', 'USER'], '/libs/test/security'),
    ];

    const index = buildReferenceIndex(pages);

    expect(index['security:jwt']).toBe('/libs/test/security');
    expect(index['role:ADMIN']).toBe('/libs/test/security');
    expect(index['role:USER']).toBe('/libs/test/security');
  });

  // ── Empty input ───────────────────────────────────────────────────

  it('returns an empty index for an empty page list', () => {
    const index = buildReferenceIndex([]);
    expect(Object.keys(index)).toHaveLength(0);
  });

  // ── Unhandled page types are silently skipped ─────────────────────

  it('silently skips page types that are not indexed', () => {
    const pages: GeneratedPage[] = [
      {
        type: PageType.GRAPH,
        slug: '/architecture/graph',
        title: 'Dependency Graph',
        data: { type: PageType.GRAPH, nodes: [], edges: [] },
      },
    ];

    const index = buildReferenceIndex(pages);
    expect(Object.keys(index)).toHaveLength(0);
  });
});
