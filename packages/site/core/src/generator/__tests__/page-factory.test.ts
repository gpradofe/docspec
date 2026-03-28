import { describe, it, expect } from 'vitest';
import { generateArtifactPages } from '../page-factory.js';
import { PageType } from '../../types/page.js';
import type { ResolvedArtifact } from '../../resolver/types.js';
import type { DocSpec } from '../../types/docspec.js';
import minimalSpec from '../../__fixtures__/minimal-spec.json';

function makeArtifact(specOverrides: Partial<DocSpec> = {}): ResolvedArtifact {
  const spec: DocSpec = {
    ...(minimalSpec as DocSpec),
    ...specOverrides,
  };
  return {
    label: 'Test App',
    color: '#3b82f6',
    source: 'local',
    spec,
  };
}

describe('generateArtifactPages', () => {
  // ── Module pages ────────────────────────────────────────────────────

  it('produces a module page for each module', () => {
    const artifact = makeArtifact({
      modules: [
        { id: 'mod-a', name: 'Module A', members: [] },
        { id: 'mod-b', name: 'Module B', members: [] },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const modulePages = pages.filter((p) => p.type === PageType.MODULE);

    expect(modulePages).toHaveLength(2);
    expect(modulePages[0].title).toBe('Module A');
    expect(modulePages[1].title).toBe('Module B');
    expect(modulePages[0].slug).toContain('mod-a');
    expect(modulePages[1].slug).toContain('mod-b');
  });

  // ── Member pages ───────────────────────────────────────────────────

  it('produces a member page for each member across all modules', () => {
    const artifact = makeArtifact({
      modules: [
        {
          id: 'mod-a',
          name: 'Module A',
          members: [
            { kind: 'class', name: 'Foo', qualified: 'com.example.Foo' },
            { kind: 'interface', name: 'Bar', qualified: 'com.example.Bar' },
          ],
        },
        {
          id: 'mod-b',
          name: 'Module B',
          members: [
            { kind: 'class', name: 'Baz', qualified: 'com.example.Baz' },
          ],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const memberPages = pages.filter((p) => p.type === PageType.MEMBER);

    expect(memberPages).toHaveLength(3);
    expect(memberPages.map((p) => p.title)).toEqual(['Foo', 'Bar', 'Baz']);
  });

  // ── Endpoint pages ─────────────────────────────────────────────────

  it('produces endpoint pages for methods with endpointMapping', () => {
    const artifact = makeArtifact({
      modules: [
        {
          id: 'api-module',
          name: 'API Module',
          members: [
            {
              kind: 'class',
              name: 'UserController',
              qualified: 'com.example.UserController',
              methods: [
                {
                  name: 'getUser',
                  params: [{ name: 'id', type: 'Long' }],
                  returns: { type: 'User' },
                  endpointMapping: { method: 'GET', path: '/api/users/{id}' },
                },
                {
                  name: 'createUser',
                  params: [{ name: 'dto', type: 'CreateUserDto' }],
                  returns: { type: 'User' },
                  endpointMapping: { method: 'POST', path: '/api/users' },
                },
                {
                  name: 'helperMethod',
                  params: [],
                  returns: { type: 'void' },
                  // No endpointMapping — should NOT produce an endpoint page
                },
              ],
            },
          ],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const endpointPages = pages.filter((p) => p.type === PageType.ENDPOINT);

    expect(endpointPages).toHaveLength(2);
    expect(endpointPages[0].title).toBe('GET /api/users/{id}');
    expect(endpointPages[1].title).toBe('POST /api/users');
  });

  it('does not produce endpoint pages when methods lack endpointMapping', () => {
    const artifact = makeArtifact({
      modules: [
        {
          id: 'service-module',
          members: [
            {
              kind: 'class',
              name: 'InternalService',
              qualified: 'com.example.InternalService',
              methods: [
                { name: 'process', params: [], returns: { type: 'void' } },
              ],
            },
          ],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const endpointPages = pages.filter((p) => p.type === PageType.ENDPOINT);

    expect(endpointPages).toHaveLength(0);
  });

  // ── Empty modules ──────────────────────────────────────────────────

  it('handles empty modules array', () => {
    const artifact = makeArtifact({ modules: [] });

    const pages = generateArtifactPages(artifact);

    const modulePages = pages.filter((p) => p.type === PageType.MODULE);
    const memberPages = pages.filter((p) => p.type === PageType.MEMBER);
    const endpointPages = pages.filter((p) => p.type === PageType.ENDPOINT);

    expect(modulePages).toHaveLength(0);
    expect(memberPages).toHaveLength(0);
    expect(endpointPages).toHaveLength(0);
  });

  // ── Graph page ─────────────────────────────────────────────────────

  it('produces a graph page when modules are present', () => {
    const artifact = makeArtifact();

    const pages = generateArtifactPages(artifact);
    const graphPages = pages.filter((p) => p.type === PageType.GRAPH);

    expect(graphPages).toHaveLength(1);
    expect(graphPages[0].title).toBe('Dependency Graph');
    expect(graphPages[0].slug).toBe('/architecture/graph');
  });

  it('does not produce a graph page for empty modules and no crossRefs', () => {
    const artifact = makeArtifact({ modules: [], crossRefs: [] });

    const pages = generateArtifactPages(artifact);
    const graphPages = pages.filter((p) => p.type === PageType.GRAPH);

    expect(graphPages).toHaveLength(0);
  });

  // ── Flow pages ─────────────────────────────────────────────────────

  it('produces flow pages for each flow', () => {
    const artifact = makeArtifact({
      flows: [
        {
          id: 'user-registration',
          name: 'User Registration',
          steps: [{ id: '1', name: 'Validate' }, { id: '2', name: 'Save' }],
        },
        {
          id: 'order-processing',
          name: 'Order Processing',
          steps: [{ id: '1', name: 'Check inventory' }],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const flowPages = pages.filter((p) => p.type === PageType.FLOW);

    expect(flowPages).toHaveLength(2);
    expect(flowPages[0].title).toBe('User Registration');
    expect(flowPages[1].title).toBe('Order Processing');
  });

  // ── Error catalog ──────────────────────────────────────────────────

  it('produces an error catalog page when errors are present', () => {
    const artifact = makeArtifact({
      errors: [
        { code: 'ERR_001', httpStatus: 400, description: 'Bad request' },
        { code: 'ERR_002', httpStatus: 404, description: 'Not found' },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const errorPages = pages.filter((p) => p.type === PageType.ERROR_CATALOG);

    expect(errorPages).toHaveLength(1);
    expect(errorPages[0].slug).toBe('/architecture/errors');
  });

  it('does not produce an error catalog page when no errors exist', () => {
    const artifact = makeArtifact({ errors: [] });

    const pages = generateArtifactPages(artifact);
    const errorPages = pages.filter((p) => p.type === PageType.ERROR_CATALOG);

    expect(errorPages).toHaveLength(0);
  });

  // ── Event catalog ──────────────────────────────────────────────────

  it('produces an event catalog page when events are present', () => {
    const artifact = makeArtifact({
      events: [{ name: 'UserCreated', description: 'User was created' }],
    });

    const pages = generateArtifactPages(artifact);
    const eventPages = pages.filter((p) => p.type === PageType.EVENT_CATALOG);

    expect(eventPages).toHaveLength(1);
    expect(eventPages[0].slug).toBe('/architecture/events');
  });

  // ── Operations page ────────────────────────────────────────────────

  it('produces an operations page when contexts exist', () => {
    const artifact = makeArtifact({
      contexts: [
        { id: 'ctx-1', name: 'Scheduled Cleanup' },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const opsPages = pages.filter((p) => p.type === PageType.OPERATIONS);

    expect(opsPages).toHaveLength(1);
    expect(opsPages[0].slug).toBe('/architecture/operations');
  });

  // ── Data store page ────────────────────────────────────────────────

  it('produces a data store page when dataStores are present', () => {
    const artifact = makeArtifact({
      dataStores: [
        { id: 'primary-db', type: 'rdbms', name: 'Primary Database', tables: ['users', 'orders'] },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const dsPages = pages.filter((p) => p.type === PageType.DATA_STORE);

    expect(dsPages).toHaveLength(1);
  });

  // ── Configuration page ─────────────────────────────────────────────

  it('produces a configuration page when configuration properties exist', () => {
    const artifact = makeArtifact({
      configuration: [
        { key: 'app.max-retries', type: 'int', default: '3' },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const configPages = pages.filter((p) => p.type === PageType.CONFIGURATION);

    expect(configPages).toHaveLength(1);
  });

  // ── Security page ─────────────────────────────────────────────────

  it('produces a security page when security is present', () => {
    const artifact = makeArtifact({
      security: {
        authMechanism: 'jwt',
        roles: ['ADMIN', 'USER'],
      },
    });

    const pages = generateArtifactPages(artifact);
    const secPages = pages.filter((p) => p.type === PageType.SECURITY);

    expect(secPages).toHaveLength(1);
  });

  // ── Privacy page ──────────────────────────────────────────────────

  it('produces a privacy page when privacy fields exist', () => {
    const artifact = makeArtifact({
      privacy: [
        { field: 'User.email', piiType: 'email', encrypted: true },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const privPages = pages.filter((p) => p.type === PageType.PRIVACY);

    expect(privPages).toHaveLength(1);
  });

  // ── Intent graph pages ─────────────────────────────────────────────

  it('produces test overview and intent graph pages when intentGraph exists', () => {
    const artifact = makeArtifact({
      intentGraph: {
        methods: [
          {
            qualified: 'com.example.TestService.doSomething',
            intentSignals: { intentDensityScore: 0.8 },
          },
        ],
      },
    });

    const pages = generateArtifactPages(artifact);
    const testOverviewPages = pages.filter((p) => p.type === PageType.TEST_OVERVIEW);
    const intentGraphPages = pages.filter((p) => p.type === PageType.INTENT_GRAPH);

    expect(testOverviewPages).toHaveLength(1);
    expect(intentGraphPages).toHaveLength(1);
  });

  // ── Artifact metadata propagation ──────────────────────────────────

  it('propagates artifact label and color to all generated pages', () => {
    const artifact = makeArtifact();

    const pages = generateArtifactPages(artifact);

    const pagesWithLabel = pages.filter((p) => p.artifactLabel !== undefined);

    // Module and member pages should carry the artifact label
    const modulePages = pages.filter((p) => p.type === PageType.MODULE);
    const memberPages = pages.filter((p) => p.type === PageType.MEMBER);

    for (const page of [...modulePages, ...memberPages]) {
      expect(page.artifactLabel).toBe('Test App');
      expect(page.artifactColor).toBe('#3b82f6');
    }
  });
});
