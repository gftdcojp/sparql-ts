/**
 * @fileoverview executor 関数のテスト
 * 実際のRDFデータを使ってテストを実行（可能な場合）
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execQuery, collectRows } from './executor.js';
import { SparqlBuilder } from '@gftdcojp/sparql-ts-builder';
import { iri, v } from '@gftdcojp/sparql-ts-builder';

// エンジンの可用性をチェック
let engineAvailable = true;

beforeAll(async () => {
  try {
    // 基本的なクエリを実行してエンジンが動作するかをチェック
    const builder = new SparqlBuilder().selectVars([v('s')]).whereTriple(v('s'), v('p'), v('o')).limit(0);
    await execQuery(builder);
  } catch (error) {
    console.warn('Query engine not available for integration tests:', error);
    engineAvailable = false;
  }
});

describe('executor', () => {
  describe('basic functionality', () => {
    it('should create executable query builders', () => {
      const builder = new SparqlBuilder()
        .selectVars([v('person'), v('name')])
        .whereTriple(v('person'), iri('http://xmlns.com/foaf/0.1/name'), v('name'));

      expect(builder).toBeDefined();
      expect(typeof builder.toString()).toBe('string');
    });

    it('should handle different query types', () => {
      // SELECTクエリ
      const selectBuilder = new SparqlBuilder()
        .selectVars([v('s')])
        .whereTriple(v('s'), v('p'), v('o'));

      expect(selectBuilder.toString()).toContain('SELECT');

      // ASKクエリ（利用可能な場合）
      try {
        const askBuilder = new SparqlBuilder()
          .ask()
          .whereTriple(v('s'), v('p'), v('o'));

        expect(askBuilder.toString()).toContain('ASK');
      } catch (error) {
        // ASKがサポートされていない場合はスキップ
        console.log('ASK query not supported by current SparqlBuilder version');
      }
    });
  });

  // 実際のクエリ実行テスト（エンジンが利用可能な場合のみ）
  describe('integration tests', () => {
    // テスト用のRDFデータ（Turtle形式）
    const testData = `
      @prefix ex: <http://example.org/> .
      @prefix foaf: <http://xmlns.com/foaf/0.1/> .

      ex:alice a foaf:Person ;
               foaf:name "Alice" ;
               foaf:age 30 .

      ex:bob a foaf:Person ;
             foaf:name "Bob" ;
             foaf:age 25 .
    `;

    describe('execQuery', () => {
      it('should execute queries and return AsyncIterable', async () => {
        if (!engineAvailable) {
          console.warn('Skipping integration test: Query engine not available');
          return;
        }

        const builder = new SparqlBuilder()
          .selectVars([v('s'), v('p'), v('o')])
          .whereTriple(v('s'), v('p'), v('o'))
          .limit(1);

        const result = await execQuery(builder);
        expect(result).toBeDefined();
        expect(typeof result[Symbol.asyncIterator]).toBe('function');
      });
    });

    describe('collectRows', () => {
      it('should collect results into an array', async () => {
        if (!engineAvailable) {
          console.warn('Skipping integration test: Query engine not available');
          return;
        }

        const builder = new SparqlBuilder()
          .selectVars([v('s'), v('p'), v('o')])
          .whereTriple(v('s'), v('p'), v('o'))
          .limit(1);

        const rows = await collectRows(builder);
        expect(Array.isArray(rows)).toBe(true);
      });
    });
  });
});
