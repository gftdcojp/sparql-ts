import { describe, it, expect, vi } from 'vitest';
import { nextRouteHandler } from '../adapters/next.js';
import { remixAction } from '../adapters/remix.js';
import type { QueryRegistry } from '../types.js';
import { z } from 'zod';

vi.mock('@gftdcojp/sparql-ts-executor', () => ({ execQuery: async () => (async function*(){ yield new Map([['id', { value: '1' }]]); })() }));
vi.mock('@gftdcojp/sparql-ts-shaper', () => ({ shapeAndMapOne: async (_b:any, row: Map<string, any>) => ({ id: row.get('id').value }) }));

const registry: QueryRegistry = {
  'op': {
    params: z.object({}).strict(),
    resultItem: z.object({ id: z.string() }),
    build: () => ({
      toSparqlAst: () => ({ type: 'query', queryType: 'SELECT', variables: [], where: [], prefixes: {} }),
      getOutputSpec: () => ({ shape: 'x', focusNodeVar: 'id', buildQuads: () => [], mapToObject: () => ({ id: 'x' }) }),
    } as any),
  },
};

function makePost(op: string) {
  return new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operation: op, params: {} }) });
}

describe('adapters', () => {
  it('next adapter POST returns 200', async () => {
    const { POST } = nextRouteHandler({ registry });
    const res = await POST(makePost('op'));
    expect(res.status).toBe(200);
  });

  it('remix adapter action returns 200', async () => {
    const action = remixAction({ registry });
    const res = await action({ request: makePost('op') } as any);
    expect(res.status).toBe(200);
  });
});


