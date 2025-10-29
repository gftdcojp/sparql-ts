/**
 * @fileoverview executor 関数のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGrapher } from '@gftdcojp/grapher/quick-start';
import { execQuery, collectRows } from './executor.js';
import { SparqlBuilder } from '@gftdcojp/sparql-ts-builder';
import { iri, v } from '@gftdcojp/sparql-ts-builder';

// @gftdcojp/grapherのモック
vi.mock('@gftdcojp/grapher/quick-start', () => ({
  createGrapher: vi.fn(),
}));

describe('executor', () => {
  let mockEngine: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = vi.fn();
    mockEngine = {
      query: mockQuery,
    };

    // createGrapherのモックをリセット
    vi.mocked(createGrapher).mockResolvedValue(mockEngine);
  });

  describe('execQuery', () => {
    it('クエリを実行し、AsyncIterable<BindingRow>を返す', async () => {
      // @gftdcojp/grapherのExecutionResult形式のモックデータを準備
      const mockResult = {
        data: [
          { name: 'Alice' },
          { name: 'Bob' },
        ],
        metadata: { queryType: 'SELECT' },
      };

      mockQuery.mockResolvedValue(mockResult);

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

    it('クエリを実行し、stringキーを持つバインディングを処理する', async () => {
      // @gftdcojp/grapherのExecutionResult形式のモックデータを準備
      const mockResult = {
        data: [
          { name: 'Alice' },
          { age: '30' },
        ],
        metadata: { queryType: 'SELECT' },
      };

      mockQuery.mockResolvedValue(mockResult);

      const builder = new SparqlBuilder()
        .selectVars([v('name'), v('age')])
        .whereTriple(v('person'), iri('http://example.org/name'), v('name'));

      const sources = ['http://example.org/data.ttl'];
      const result = await execQuery(builder, mockEngine, sources);

      const rows = [];
      for await (const row of result) {
        rows.push(row);
      }

      expect(rows).toHaveLength(2);
      expect(rows[0].get('name')?.value).toBe('Alice');
      expect(rows[1].get('age')?.value).toBe('30');
    });

    it('クエリを実行し、Variableキーを持つバインディングを処理する', async () => {
      // @gftdcojp/grapherのExecutionResult形式のモックデータを準備
      const mockResult = {
        data: [
          { name: 'Alice' },
          { age: '30' },
        ],
        metadata: { queryType: 'SELECT' },
      };

      mockQuery.mockResolvedValue(mockResult);

      const builder = new SparqlBuilder()
        .selectVars([v('name'), v('age')])
        .whereTriple(v('person'), iri('http://example.org/name'), v('name'));

      const sources = ['http://example.org/data.ttl'];
      const result = await execQuery(builder, mockEngine, sources);

      const rows = [];
      for await (const row of result) {
        rows.push(row);
      }

      expect(rows).toHaveLength(2);
      expect(rows[0].get('name')?.value).toBe('Alice');
      expect(rows[1].get('age')?.value).toBe('30');
    });

    it('クエリ実行エラーを適切に処理する', async () => {
      mockQuery.mockRejectedValue(new Error('Query failed'));

      const builder = new SparqlBuilder().selectVars([v('x')]);
      const sources = ['http://example.org/data.ttl'];

      await expect(execQuery(builder, mockEngine, sources))
        .rejects
        .toThrow('SPARQL query execution failed: Query failed');
    });

    it('非Errorオブジェクトのエラーを適切に処理する', async () => {
      mockQuery.mockRejectedValue('String error');

      const builder = new SparqlBuilder().selectVars([v('x')]);
      const sources = ['http://example.org/data.ttl'];

      await expect(execQuery(builder, mockEngine, sources))
        .rejects
        .toThrow('SPARQL query execution failed: String error');
    });
  });

  describe('collectRows', () => {
    it('全ての行を配列として収集する', async () => {
      // @gftdcojp/grapherのExecutionResult形式のモックデータを準備
      const mockResult = {
        data: [
          { id: 'http://example.org/person1' },
          { id: 'http://example.org/person2' },
        ],
        metadata: { queryType: 'SELECT' },
      };

      mockQuery.mockResolvedValue(mockResult);

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

    it('collectRowsでクエリ実行エラーが発生した場合、エラーを伝播する', async () => {
      mockQuery.mockRejectedValue(new Error('Query failed'));

      const builder = new SparqlBuilder().selectVars([v('x')]);
      const sources = ['http://example.org/data.ttl'];

      await expect(collectRows(builder, mockEngine, sources))
        .rejects
        .toThrow('SPARQL query execution failed: Query failed');
    });
  });
});
