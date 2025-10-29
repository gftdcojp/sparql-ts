import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSparqlServer } from '../server.js';
import type { QueryRegistry } from '../types.js';
import { z } from 'zod';

// Mocks for executor and shaper
vi.mock('@gftdcojp/sparql-ts-executor', () => ({
  execQuery: vi.fn(),
}));
vi.mock('@gftdcojp/sparql-ts-shaper', () => ({
  shapeAndMapOne: vi.fn(),
}));

const { execQuery } = await import('@gftdcojp/sparql-ts-executor');
const { shapeAndMapOne } = await import('@gftdcojp/sparql-ts-shaper');

function asyncRows(rows: Array<Map<string, any>>) {
  return (async function* () {
    for (const r of rows) yield r;
  })();
}

function makeRequest(body: unknown, method: string = 'POST') {
  return new Request('http://localhost/api', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('createSparqlServer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 405 for non-POST', async () => {
    const server = createSparqlServer({ registry: {} as QueryRegistry });
    const res = await server.handle(new Request('http://localhost', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('returns 404 when operation not found', async () => {
    const server = createSparqlServer({ registry: {} as QueryRegistry });
    const res = await server.handle(makeRequest({ operation: 'unknown' }));
    expect(res.status).toBe(404);
  });

  it('returns 400 on params validation error (logs)', async () => {
    const registry: QueryRegistry = {
      'op': {
        params: z.object({ req: z.string() }),
        resultItem: z.object({ ok: z.boolean() }),
        build: () => ({
          toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
          getOutputSpec: () => ({
            shape: 'x',
            focusNodeVar: 'id',
            buildQuads: () => [],
            mapToObject: () => ({ ok: true }),
          }),
        } as any),
      },
    };
    const logger = vi.fn();
    const server = createSparqlServer({ registry, logger });
    const res = await server.handle(makeRequest({ operation: 'op', params: {} }));
    expect(res.status).toBe(400);
    expect(logger).toHaveBeenCalled();
  });

  it('returns 500 when OutputSpec is missing (logs)', async () => {
    (execQuery as any).mockResolvedValue(asyncRows([]));
    const registry: QueryRegistry = {
      'op': {
        params: z.object({}).strict(),
        resultItem: z.object({ ok: z.boolean() }),
        build: () => ({
          toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
          getOutputSpec: () => undefined,
        } as any),
      },
    };
    const logger = vi.fn();
    const server = createSparqlServer({ registry, logger });
    const res = await server.handle(makeRequest({ operation: 'op', params: {} }));
    expect(res.status).toBe(500);
    expect(logger).toHaveBeenCalled();
  });

  it('returns 200 with mapped results', async () => {
    (execQuery as any).mockResolvedValue(asyncRows([
      new Map([['id', { value: '1' }]]),
      new Map([['id', { value: '2' }]]),
    ]));
    (shapeAndMapOne as any).mockImplementation(async (_builder: any, row: Map<string, any>) => ({ id: row.get('id').value }));

    const registry: QueryRegistry = {
      'op': {
        params: z.object({}).strict(),
        resultItem: z.object({ id: z.string() }),
        build: () => ({
          toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
          getOutputSpec: () => ({
            shape: 'x',
            focusNodeVar: 'id',
            buildQuads: () => [],
            mapToObject: () => ({ id: 'x' }),
          }),
        } as any),
      },
    };
    const server = createSparqlServer({ registry });
    const res = await server.handle(makeRequest({ operation: 'op', params: {} }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([{ id: '1' }, { id: '2' }]);
    expect(json.meta.operation).toBe('op');
  });

  it('uses default empty params when params is missing', async () => {
    (execQuery as any).mockResolvedValue(asyncRows([]));
    const registry: QueryRegistry = {
      'op': {
        params: z.object({}).strict(),
        resultItem: z.object({ id: z.string() }).optional().transform(() => ({ id: 'x' } as any)),
        build: () => ({
          toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
          getOutputSpec: () => ({
            shape: 'x',
            focusNodeVar: 'id',
            buildQuads: () => [],
            mapToObject: () => ({ id: 'x' }),
          }),
        } as any),
      },
    };
    const server = createSparqlServer({ registry });
    const res = await server.handle(makeRequest({ operation: 'op' }));
    expect(res.status).toBe(200);
  });

  it('propagates hinted status from authorization error', async () => {
    (execQuery as any).mockResolvedValue(asyncRows([]));
    const registry: QueryRegistry = {
      'op': {
        params: z.object({}).strict(),
        resultItem: z.object({ ok: z.boolean() }),
        build: () => ({
          toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
          getOutputSpec: () => ({
            shape: 'x', focusNodeVar: 'id', buildQuads: () => [], mapToObject: () => ({ ok: true }),
          }),
        } as any),
      },
    };
    const e = Object.assign(new Error('forbidden'), { status: 403 });
    const server = createSparqlServer({ registry, authorizeOperation: () => { throw e; } });
    const res = await server.handle(makeRequest({ operation: 'op', params: {} }));
    expect(res.status).toBe(403);
  });

  it('skips rows rejected by authorizeRow', async () => {
    (execQuery as any).mockResolvedValue(asyncRows([
      new Map([['id', { value: '1' }]]),
      new Map([['id', { value: '2' }]]),
    ]));
    (shapeAndMapOne as any).mockImplementation(async (_builder: any, row: Map<string, any>) => ({ id: row.get('id').value }));

    const registry: QueryRegistry = {
      'op': {
        params: z.object({}).strict(),
        resultItem: z.object({ id: z.string() }),
        build: () => ({
          toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
          getOutputSpec: () => ({
            shape: 'x', focusNodeVar: 'id', buildQuads: () => [], mapToObject: () => ({ id: 'x' }),
          }),
        } as any),
      },
    };

    const server = createSparqlServer({
      registry,
      authorizeRow: ({ row }) => {
        if (row.get('id')?.value === '1') {
          const e = Object.assign(new Error('deny row'), { status: 403 });
          throw e;
        }
      },
    });
    const res = await server.handle(makeRequest({ operation: 'op', params: {} }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([{ id: '2' }]);
  });

  it('handles non-Error throws (message String(e))', async () => {
    (execQuery as any).mockResolvedValue(asyncRows([]));
    const registry: QueryRegistry = {
      'op': {
        params: z.object({}).strict(),
        resultItem: z.object({ ok: z.boolean() }),
        build: () => ({
          toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
          getOutputSpec: () => ({ shape: 'x', focusNodeVar: 'id', buildQuads: () => [], mapToObject: () => ({ ok: true }) }),
        } as any),
      },
    };
    const server = createSparqlServer({ registry, authorizeOperation: () => { throw 123 as any; } });
    const res = await server.handle(makeRequest({ operation: 'op' }));
    expect(res.status).toBe(500);
  });
});


