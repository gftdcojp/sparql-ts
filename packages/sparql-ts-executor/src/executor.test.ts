/**
 * @fileoverview executor 関数のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryEngine } from '@comunica/query-sparql';
import { execQuery, collectRows } from './executor.js';
import { SparqlBuilder } from '@gftdcojp/sparql-ts-builder';
import { iri, v } from '@gftdcojp/sparql-ts-builder';

// Comunicaのモック
vi.mock('@comunica/query-sparql', () => ({
  QueryEngine: vi.fn().mockImplementation(() => ({
    queryBindings: vi.fn(),
  })),
}));

describe('executor', () => {
  let mockEngine: QueryEngine;
  let mockQueryBindings: any;

  beforeEach(() => {
    mockQueryBindings = vi.fn();
    mockEngine = new QueryEngine();
    (mockEngine as any).queryBindings = mockQueryBindings;
  });

  describe('execQuery', () => {
    it('クエリを実行し、AsyncIterable<BindingRow>を返す', async () => {
      // モックデータの準備
      const mockBindings = [
        new Map([['name', { termType: 'Literal', value: 'Alice' }]]),
        new Map([['name', { termType: 'Literal', value: 'Bob' }]]),
      ];

      // AsyncIterableを模擬
      const mockStream = (async function* () {
        for (const binding of mockBindings) {
          yield binding;
        }
      })();

      mockQueryBindings.mockResolvedValue(mockStream);

      // テスト実行
      const builder = new SparqlBuilder()
        .selectVars([v('name')])
        .whereTriple(v('person'), iri('http://example.org/name'), v('name'));

      const sources = ['http://example.org/data.ttl'];
      const result = await execQuery(builder, mockEngine, sources);

      // 結果の検証
      const rows = [];
      for await (const row of result) {
        rows.push(row);
      }

      expect(rows).toHaveLength(2);
      expect(rows[0].get('name')?.value).toBe('Alice');
      expect(rows[1].get('name')?.value).toBe('Bob');
    });

    it('クエリ実行エラーを適切に処理する', async () => {
      mockQueryBindings.mockRejectedValue(new Error('Query failed'));

      const builder = new SparqlBuilder().selectVars([v('x')]);
      const sources = ['http://example.org/data.ttl'];

      await expect(execQuery(builder, mockEngine, sources))
        .rejects
        .toThrow('SPARQL query execution failed: Query failed');
    });
  });

  describe('collectRows', () => {
    it('全ての行を配列として収集する', async () => {
      // モックデータの準備
      const mockBindings = [
        new Map([['id', { termType: 'NamedNode', value: 'http://example.org/person1' }]]),
        new Map([['id', { termType: 'NamedNode', value: 'http://example.org/person2' }]]),
      ];

      const mockStream = (async function* () {
        for (const binding of mockBindings) {
          yield binding;
        }
      })();

      mockQueryBindings.mockResolvedValue(mockStream);

      // テスト実行
      const builder = new SparqlBuilder()
        .selectVars([v('id')])
        .whereTriple(v('id'), iri('a'), iri('http://example.org/Person'));

      const sources = ['http://example.org/data.ttl'];
      const rows = await collectRows(builder, mockEngine, sources);

      expect(rows).toHaveLength(2);
      expect(rows[0].get('id')?.value).toBe('http://example.org/person1');
      expect(rows[1].get('id')?.value).toBe('http://example.org/person2');
    });
  });
});
