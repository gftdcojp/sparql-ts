/**
 * @fileoverview shaper 関数のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SparqlBuilder } from '@gftdcojp/sparql-ts-builder';
import { shapeAndMapAll, shapeAndMapOne } from './shaper.js';

// @gftdcojp/resourcebox のモック
vi.mock('./__mocks__/@gftdcojp/resourcebox.js');

import { validateQuadsWithShape } from './__mocks__/@gftdcojp/resourcebox.js';
const mockValidateQuadsWithShape = vi.mocked(validateQuadsWithShape);

describe('shaper', () => {
  beforeEach(() => {
    // モックをリセット
    mockValidateQuadsWithShape.mockClear();
  });

  describe('shapeAndMapAll', () => {
    it('OutputSpecが未設定の場合はエラーを投げる', async () => {
      const builder = new SparqlBuilder();
      const rows = (async function* () {})();

      await expect(shapeAndMapAll(builder, rows))
        .rejects
        .toThrow('OutputSpec must be set on SparqlBuilder');
    });

    it('SHACL検証に合格した行のみをDTOに変換する', async () => {
      // モック設定: 1行目は合格、2行目は失敗
      mockValidateQuadsWithShape
        .mockResolvedValueOnce(undefined) // 1行目は合格
        .mockRejectedValueOnce(new Error('Validation failed')); // 2行目は失敗

      const spec = {
        shape: 'http://example.org/PersonShape',
        focusNodeVar: 'id',
        buildQuads: vi.fn(() => []),
        mapToObject: vi.fn((binding) => ({
          id: binding.get('id')?.value,
          name: binding.get('name')?.value,
        })),
      };

      const builder = new SparqlBuilder().setOutputSpec(spec);

      const rows = (async function* () {
        yield new Map([
          ['id', { termType: 'NamedNode', value: 'http://example.org/person1' }],
          ['name', { termType: 'Literal', value: 'Alice' }],
        ]);
        yield new Map([
          ['id', { termType: 'NamedNode', value: 'http://example.org/person2' }],
          ['name', { termType: 'Literal', value: 'Bob' }],
        ]);
      })();

      const results = await shapeAndMapAll(builder, rows);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'http://example.org/person1',
        name: 'Alice',
      });

      expect(mockValidateQuadsWithShape).toHaveBeenCalledTimes(2);
    });

    it('focusNodeVarが見つからない場合はエラーを投げる', async () => {
      const spec = {
        shape: 'http://example.org/PersonShape',
        focusNodeVar: 'id', // この変数が存在しない
        buildQuads: vi.fn(() => []),
        mapToObject: vi.fn(() => ({})),
      };

      const builder = new SparqlBuilder().setOutputSpec(spec);

      const rows = (async function* () {
        yield new Map([
          ['name', { termType: 'Literal', value: 'Alice' }],
          // 'id' が存在しない
        ]);
      })();

      await expect(shapeAndMapAll(builder, rows))
        .rejects
        .toThrow("focusNodeVar 'id' not found in binding row");
    });
  });

  describe('shapeAndMapOne', () => {
    it('単一の行を検証・マッピングする', async () => {
      mockValidateQuadsWithShape.mockResolvedValue(undefined);

      const spec = {
        shape: 'http://example.org/PersonShape',
        focusNodeVar: 'id',
        buildQuads: vi.fn(() => []),
        mapToObject: vi.fn((binding) => ({
          id: binding.get('id')?.value,
          age: Number(binding.get('age')?.value),
        })),
      };

      const builder = new SparqlBuilder().setOutputSpec(spec);

      const row = new Map([
        ['id', { termType: 'NamedNode', value: 'http://example.org/person1' }],
        ['age', { termType: 'Literal', value: '25' }],
      ]);

      const result = await shapeAndMapOne(builder, row);

      expect(result).toEqual({
        id: 'http://example.org/person1',
        age: 25,
      });
    });

    it('OutputSpecが未設定の場合はエラーを投げる', async () => {
      const builder = new SparqlBuilder();
      const row = new Map();

      await expect(shapeAndMapOne(builder, row))
        .rejects
        .toThrow('OutputSpec must be set on SparqlBuilder before calling shapeAndMapOne');
    });

    it('focusNodeVarが見つからない場合はエラーを投げる', async () => {
      const spec = {
        shape: 'http://example.org/PersonShape',
        focusNodeVar: 'id', // この変数が存在しない
        buildQuads: vi.fn(() => []),
        mapToObject: vi.fn(() => ({})),
      };

      const builder = new SparqlBuilder().setOutputSpec(spec);

      const row = new Map([
        ['name', { termType: 'Literal', value: 'Alice' }],
        // 'id' が存在しない
      ]);

      await expect(shapeAndMapOne(builder, row))
        .rejects
        .toThrow("focusNodeVar 'id' not found in binding row");
    });
  });

  describe('runTypedQuery', () => {
    it('クエリ構築・実行・検証・マッピングを一括で行う', async () => {
      // execQueryのモック
      const mockExecQuery = vi.fn();
      vi.doMock('@gftdcojp/sparql-ts-executor', () => ({
        execQuery: mockExecQuery,
      }));

      const { runTypedQuery } = await import('./shaper.js');

      mockValidateQuadsWithShape.mockResolvedValue(undefined);

      const spec = {
        shape: 'http://example.org/PersonShape',
        focusNodeVar: 'id',
        buildQuads: vi.fn(() => []),
        mapToObject: vi.fn((binding) => ({
          id: binding.get('id')?.value,
          name: binding.get('name')?.value,
        })),
      };

      const builder = new SparqlBuilder().setOutputSpec(spec);

      const mockRows = (async function* () {
        yield new Map([
          ['id', { termType: 'NamedNode', value: 'http://example.org/person1' }],
          ['name', { termType: 'Literal', value: 'Alice' }],
        ]);
      })();

      mockExecQuery.mockResolvedValue(mockRows);

      const mockEngine = {};
      const sources = ['http://example.org/data.ttl'];

      const result = await runTypedQuery(builder, mockEngine as any, sources);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'http://example.org/person1',
        name: 'Alice',
      });
    });
  });
});
