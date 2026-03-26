import { describe, it, expect } from 'vitest';
import { generateLlmsTxt } from '../llms-txt.js';
import { PageType } from '../../types/page.js';
import type {
  GeneratedPage,
  ModulePageData,
  MemberPageData,
  EndpointPageData,
  FlowPageData,
  DataModelPageData,
  ErrorCatalogPageData,
  EventCatalogPageData,
} from '../../types/page.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModulePage(id: string, name: string, memberCount: number): GeneratedPage {
  const data: ModulePageData = {
    type: PageType.MODULE,
    module: {
      id,
      name,
      members: Array.from({ length: memberCount }, (_, i) => ({
        kind: 'class' as const,
        name: `Member${i}`,
        qualified: `com.example.${name}.Member${i}`,
      })),
    },
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.MODULE, slug: `/libs/test/modules/${id}`, title: name, data };
}

function makeMemberPage(
  name: string,
  qualified: string,
  methods: Array<{ name: string; params?: Array<{ name: string; type: string }>; returns?: { type: string }; description?: string }> = [],
): GeneratedPage {
  const data: MemberPageData = {
    type: PageType.MEMBER,
    member: {
      kind: 'class',
      name,
      qualified,
      methods,
    },
    moduleId: 'test-module',
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.MEMBER, slug: `/libs/test/members/${name.toLowerCase()}`, title: name, data };
}

function makeEndpointPage(
  httpMethod: string,
  path: string,
  methodDesc?: string,
  params?: Array<{ name: string; type: string; required?: boolean; description?: string }>,
  returns?: { type: string },
): GeneratedPage {
  const data: EndpointPageData = {
    type: PageType.ENDPOINT,
    method: {
      name: 'handler',
      description: methodDesc,
      endpointMapping: {
        method: httpMethod as 'GET' | 'POST',
        path,
      },
      params,
      returns,
    },
    memberQualified: 'com.example.Controller',
    memberName: 'Controller',
    artifact: { label: 'TestApp' },
  };
  return { type: PageType.ENDPOINT, slug: `/api/test/${httpMethod.toLowerCase()}-${path}`, title: `${httpMethod} ${path}`, data };
}

function makeFlowPage(
  id: string,
  name: string,
  trigger?: string,
  steps: Array<{ id: string; name?: string; description?: string }> = [],
): GeneratedPage {
  return {
    type: PageType.FLOW,
    slug: `/architecture/flows/${id}`,
    title: name,
    data: {
      type: PageType.FLOW,
      flow: { id, name, trigger, steps },
      artifact: { label: 'TestApp' },
    } as FlowPageData,
  };
}

function makeErrorCatalogPage(
  errors: Array<{ code: string; httpStatus?: number; description?: string }>,
): GeneratedPage {
  return {
    type: PageType.ERROR_CATALOG,
    slug: '/architecture/errors',
    title: 'Error Catalog',
    data: {
      type: PageType.ERROR_CATALOG,
      errors,
      artifact: { label: 'TestApp' },
    } as ErrorCatalogPageData,
  };
}

function makeEventCatalogPage(
  events: Array<{ name: string; description?: string; channel?: string }>,
): GeneratedPage {
  return {
    type: PageType.EVENT_CATALOG,
    slug: '/architecture/events',
    title: 'Event Catalog',
    data: {
      type: PageType.EVENT_CATALOG,
      events,
      artifact: { label: 'TestApp' },
    } as EventCatalogPageData,
  };
}

function makeDataModelPage(
  name: string,
  qualified: string,
  table?: string,
  description?: string,
): GeneratedPage {
  return {
    type: PageType.DATA_MODEL,
    slug: `/architecture/data-models/${name.toLowerCase()}`,
    title: name,
    data: {
      type: PageType.DATA_MODEL,
      dataModel: { name, qualified, table, description },
      artifact: { label: 'TestApp' },
    } as DataModelPageData,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateLlmsTxt', () => {
  // ── Header ────────────────────────────────────────────────────────

  it('produces a header with the site name', () => {
    const result = generateLlmsTxt([], 'My Docs');

    expect(result).toContain('# My Docs');
    expect(result).toContain('> This file contains a concise summary');
  });

  // ── Empty pages ───────────────────────────────────────────────────

  it('returns only the header for an empty page list', () => {
    const result = generateLlmsTxt([], 'My Docs');
    const lines = result.split('\n').filter((l) => l.trim().length > 0);

    // Should just be the heading and the blockquote
    expect(lines).toHaveLength(2);
  });

  // ── Modules section ───────────────────────────────────────────────

  it('generates a Modules section with name, stereotype, and member count', () => {
    const pages = [
      makeModulePage('core', 'Core', 3),
    ];
    // Set a stereotype on the module data
    (pages[0].data as ModulePageData).module.stereotype = 'service';

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('## Modules');
    expect(result).toContain('### Core');
    expect(result).toContain('Stereotype: service');
    expect(result).toContain('Members: 3');
  });

  it('uses module id as fallback when name is missing', () => {
    const pages = [makeModulePage('my-mod', 'my-mod', 0)];
    (pages[0].data as ModulePageData).module.name = undefined;

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('### my-mod');
  });

  // ── Members section ───────────────────────────────────────────────

  it('generates a Classes & Interfaces section with method signatures', () => {
    const pages = [
      makeMemberPage('UserService', 'com.example.UserService', [
        {
          name: 'findById',
          params: [{ name: 'id', type: 'Long' }],
          returns: { type: 'User' },
          description: 'Finds a user by their ID.',
        },
        {
          name: 'deleteAll',
          params: [],
          returns: { type: 'void' },
        },
      ]),
    ];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('## Classes & Interfaces');
    expect(result).toContain('### com.example.UserService');
    expect(result).toContain('Kind: class');
    expect(result).toContain('- User findById(Long id)');
    expect(result).toContain('  Finds a user by their ID.');
    expect(result).toContain('- void deleteAll()');
  });

  // ── Endpoints section ─────────────────────────────────────────────

  it('generates an API Endpoints section with parameters and return type', () => {
    const pages = [
      makeEndpointPage(
        'GET',
        '/api/users/{id}',
        'Fetch a single user',
        [{ name: 'id', type: 'Long', required: true, description: 'The user ID' }],
        { type: 'User' },
      ),
    ];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('## API Endpoints');
    expect(result).toContain('### GET /api/users/{id}');
    expect(result).toContain('Fetch a single user');
    expect(result).toContain('- id (Long, required): The user ID');
    expect(result).toContain('Returns: User');
  });

  it('defaults to GET when endpoint method is missing', () => {
    const page: GeneratedPage = {
      type: PageType.ENDPOINT,
      slug: '/api/test/fallback',
      title: '/api/fallback',
      data: {
        type: PageType.ENDPOINT,
        method: {
          name: 'fallback',
          endpointMapping: { path: '/api/fallback' },
        },
        memberQualified: 'com.example.Ctrl',
        memberName: 'Ctrl',
        artifact: { label: 'TestApp' },
      } as EndpointPageData,
    };

    const result = generateLlmsTxt([page], 'My Docs');

    expect(result).toContain('### GET /api/fallback');
  });

  // ── Flows section ─────────────────────────────────────────────────

  it('generates a Flows section with trigger and steps', () => {
    const pages = [
      makeFlowPage('signup', 'User Signup', 'HTTP POST /signup', [
        { id: '1', name: 'Validate input', description: 'Check fields' },
        { id: '2', name: 'Create user', description: 'Persist to DB' },
      ]),
    ];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('## Flows');
    expect(result).toContain('### User Signup');
    expect(result).toContain('Trigger: HTTP POST /signup');
    expect(result).toContain('1. Validate input: Check fields');
    expect(result).toContain('2. Create user: Persist to DB');
  });

  // ── Data Models section ───────────────────────────────────────────

  it('generates a Data Models section with table names', () => {
    const pages = [
      makeDataModelPage('User', 'com.example.User', 'users', 'The user entity'),
    ];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('## Data Models');
    expect(result).toContain('### User');
    expect(result).toContain('The user entity');
    expect(result).toContain('Table: users');
  });

  // ── Error Codes section ───────────────────────────────────────────

  it('generates an Error Codes section', () => {
    const pages = [
      makeErrorCatalogPage([
        { code: 'ERR_001', httpStatus: 400, description: 'Bad request' },
        { code: 'ERR_002', httpStatus: 404, description: 'Not found' },
      ]),
    ];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('## Error Codes');
    expect(result).toContain('- ERR_001 (HTTP 400): Bad request');
    expect(result).toContain('- ERR_002 (HTTP 404): Not found');
  });

  it('omits HTTP status when not provided', () => {
    const pages = [
      makeErrorCatalogPage([{ code: 'ERR_GENERIC', description: 'Something went wrong' }]),
    ];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('- ERR_GENERIC: Something went wrong');
    expect(result).not.toContain('HTTP');
  });

  // ── Events section ────────────────────────────────────────────────

  it('generates an Events section with channels', () => {
    const pages = [
      makeEventCatalogPage([
        { name: 'UserCreated', description: 'Fired when a new user is created', channel: 'user-events' },
        { name: 'OrderPlaced', description: 'Fired when an order is placed' },
      ]),
    ];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).toContain('## Events');
    expect(result).toContain('- UserCreated: Fired when a new user is created');
    expect(result).toContain('  Channel: user-events');
    expect(result).toContain('- OrderPlaced: Fired when an order is placed');
  });

  // ── Combined output ───────────────────────────────────────────────

  it('generates all sections in order when all page types are present', () => {
    const pages: GeneratedPage[] = [
      makeModulePage('core', 'Core', 1),
      makeMemberPage('Foo', 'com.example.Foo'),
      makeEndpointPage('GET', '/api/health'),
      makeFlowPage('test-flow', 'Test Flow', undefined, [{ id: '1' }]),
      makeDataModelPage('Item', 'com.example.Item'),
      makeErrorCatalogPage([{ code: 'E1' }]),
      makeEventCatalogPage([{ name: 'Evt1' }]),
    ];

    const result = generateLlmsTxt(pages, 'Full Site');

    // Verify section ordering
    const moduleIdx = result.indexOf('## Modules');
    const membersIdx = result.indexOf('## Classes & Interfaces');
    const endpointsIdx = result.indexOf('## API Endpoints');
    const flowsIdx = result.indexOf('## Flows');
    const dataModelsIdx = result.indexOf('## Data Models');
    const errorsIdx = result.indexOf('## Error Codes');
    const eventsIdx = result.indexOf('## Events');

    expect(moduleIdx).toBeLessThan(membersIdx);
    expect(membersIdx).toBeLessThan(endpointsIdx);
    expect(endpointsIdx).toBeLessThan(flowsIdx);
    expect(flowsIdx).toBeLessThan(dataModelsIdx);
    expect(dataModelsIdx).toBeLessThan(errorsIdx);
    expect(errorsIdx).toBeLessThan(eventsIdx);
  });

  // ── Sections omitted when no pages of that type ───────────────────

  it('omits Modules section when no module pages exist', () => {
    const pages = [makeMemberPage('Foo', 'com.example.Foo')];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).not.toContain('## Modules');
    expect(result).toContain('## Classes & Interfaces');
  });

  it('omits API Endpoints section when no endpoint pages exist', () => {
    const pages = [makeModulePage('core', 'Core', 0)];

    const result = generateLlmsTxt(pages, 'My Docs');

    expect(result).not.toContain('## API Endpoints');
  });
});
