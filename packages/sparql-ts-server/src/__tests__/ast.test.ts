import { describe, it, expect } from 'vitest';
import { SparqlBuilder, v, iri } from '@gftdcojp/sparql-ts-builder';
import { analyzeBuilder } from '../util/ast.js';

describe('analyzeBuilder', () => {
  it('collects IRIs and prefixes from SparqlBuilder AST', () => {
    const b = new SparqlBuilder()
      .prefix('ex', 'http://example.org/schema#')
      .selectVars([v('x')])
      .whereTriple(v('x'), iri('a'), iri('http://example.org/schema#Person'))
      .limit(1);

    const { usedIris, prefixes } = analyzeBuilder(b);
    expect(usedIris.some(i => i.includes('http://example.org/schema#Person'))).toBe(true);
    expect(prefixes).toHaveProperty('ex', 'http://example.org/schema#');
  });

  it('walks optional and generic pattern arrays', () => {
    const fakeBuilder = {
      toSparqlAst() {
        return {
          type: 'query',
          queryType: 'SELECT',
          variables: [],
          prefixes: {},
          where: [
            {
              type: 'optional',
              patterns: [
                {
                  type: 'bgp',
                  triples: [{
                    subject: { termType: 'NamedNode', value: 'http://s' },
                    predicate: { termType: 'NamedNode', value: 'http://p' },
                    object: { termType: 'NamedNode', value: 'http://o' },
                  }],
                },
              ],
            },
            {
              type: 'group',
              patterns: [
                {
                  type: 'bgp',
                  triples: [{
                    subject: { termType: 'NamedNode', value: 'http://s2' },
                    predicate: { termType: 'NamedNode', value: 'http://p2' },
                    object: { termType: 'NamedNode', value: 'http://o2' },
                  }],
                },
              ],
            },
          ],
        };
      },
    } as any;

    const { usedIris } = analyzeBuilder(fakeBuilder);
    expect(usedIris).toEqual(expect.arrayContaining([
      'http://s', 'http://p', 'http://o', 'http://s2', 'http://p2', 'http://o2',
    ]));
  });

  it('handles null patterns and defaults for where/prefixes', () => {
    const fakeBuilder = {
      toSparqlAst() {
        return {
          type: 'query',
          queryType: 'SELECT',
          variables: [],
          where: [null],
          // prefixes omitted to trigger default {}
        } as any;
      },
    } as any;
    const { usedIris, prefixes } = analyzeBuilder(fakeBuilder);
    expect(usedIris).toEqual([]);
    expect(prefixes).toEqual({});
  });

  it('defaults when where is missing (non-array path)', () => {
    const fakeBuilder = {
      toSparqlAst() {
        return {
          type: 'query',
          queryType: 'SELECT',
          variables: [],
          // where omitted entirely
        } as any;
      },
    } as any;
    const { usedIris, prefixes } = analyzeBuilder(fakeBuilder);
    expect(usedIris).toEqual([]);
    expect(prefixes).toEqual({});
  });

  it('evaluates false branch for generic patterns clause', () => {
    const fakeBuilder = {
      toSparqlAst() {
        return {
          type: 'query',
          queryType: 'SELECT',
          variables: [],
          prefixes: {},
          where: [
            { type: 'service' }, // p.patterns is undefined -> false path of Array.isArray
            { type: 'bgp', triples: [{
              subject: { termType: 'NamedNode', value: 'http://s3' },
              predicate: { termType: 'NamedNode', value: 'http://p3' },
              object: { termType: 'NamedNode', value: 'http://o3' },
            }]},
          ],
        } as any;
      },
    } as any;
    const { usedIris } = analyzeBuilder(fakeBuilder);
    expect(usedIris).toEqual(expect.arrayContaining(['http://s3','http://p3','http://o3']));
  });
});


