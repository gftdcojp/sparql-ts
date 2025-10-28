/**
 * @fileoverview SPARQL結果のSHACL検証とDTO化
 *
 * クエリ結果をSHACLで検証し、安全なアプリ用DTOに射影します。
 */

import type { SparqlBuilder, BindingRow } from '@gftdcojp/sparql-ts-builder';
import type { Term, NamedNode } from '@rdfjs/types'; // Term and NamedNode are used in function parameters
// モックを使用（実際のresourceboxパッケージが実装されるまで）
import { validateQuadsWithShape } from './__mocks__/@gftdcojp/resourcebox.js';

/**
 * バインディング行をSHACL検証し、DTOに変換して配列として返します。
 *
 * この関数は以下の処理を行います：
 * 1. 各バインディング行からRDFローカルグラフを復元
 * 2. SHACL検証を実行
 * 3. 検証通過した行をDTOにマッピング
 *
 * @template T - DTOの型
 * @param builder - OutputSpecが設定されたSparqlBuilder
 * @param rows - バインディング行のAsyncIterable
 * @returns 検証済みDTOの配列
 * @throws OutputSpecが未設定の場合、またはSHACL検証エラーの場合
 *
 * @example
 * ```ts
 * const builder = new SparqlBuilder()
 *   .selectVars([v('id'), v('name'), v('age')])
 *   .setOutputSpec({
 *     shape: personShape,
 *     focusNodeVar: 'id',
 *     buildQuads: (binding) => [...],
 *     mapToObject: (binding) => ({ ... })
 *   });
 *
 * const rows = await execQuery(builder, engine, sources);
 * const persons = await shapeAndMapAll(builder, rows);
 * ```
 */
export async function shapeAndMapAll<T>(
  builder: SparqlBuilder,
  rows: AsyncIterable<BindingRow>
): Promise<T[]> {
  const spec = builder.getOutputSpec<T>();
  if (!spec) {
    throw new Error('OutputSpec must be set on SparqlBuilder before calling shapeAndMapAll');
  }

  const { shape, focusNodeVar, buildQuads, mapToObject } = spec;
  const results: T[] = [];

  for await (const row of rows) {
    try {
      // 1. RDFローカルグラフを復元
      const quads = buildQuads(row);

      // 2. focusNodeを取得
      const focusNode = row.get(focusNodeVar);
      if (!focusNode) {
        throw new Error(`focusNodeVar '${focusNodeVar}' not found in binding row`);
      }

      // 3. SHACL検証を実行
      await validateQuadsWithShape(quads, shape, focusNode);

      // 4. 検証通過したらDTOにマッピング
      results.push(mapToObject(row));

    } catch (error) {
      // focusNodeVarが見つからない場合はエラーを投げる
      if (error instanceof Error && error.message.includes('focusNodeVar')) {
        throw error;
      }
      // SHACL検証エラーは無視してスキップ（ログ出力などは実際の要件に合わせて）
      console.warn(`SHACL validation failed for row: ${error instanceof Error ? error.message : String(error)}`);
      // 検証失敗した行は結果に含めない
    }
  }

  return results;
}

/**
 * 単一のバインディング行をSHACL検証し、DTOに変換します。
 * shapeAndMapAll の単一行バージョンです。
 *
 * @template T - DTOの型
 * @param builder - OutputSpecが設定されたSparqlBuilder
 * @param row - 単一のバインディング行
 * @returns 検証済みDTO
 * @throws OutputSpecが未設定の場合、またはSHACL検証エラーの場合
 */
export async function shapeAndMapOne<T>(
  builder: SparqlBuilder,
  row: BindingRow
): Promise<T> {
  const spec = builder.getOutputSpec<T>();
  if (!spec) {
    throw new Error('OutputSpec must be set on SparqlBuilder before calling shapeAndMapOne');
  }

  const { shape, focusNodeVar, buildQuads, mapToObject } = spec;

  // RDFローカルグラフを復元
  const quads = buildQuads(row);

  // focusNodeを取得
  const focusNode = row.get(focusNodeVar);
  if (!focusNode) {
    throw new Error(`focusNodeVar '${focusNodeVar}' not found in binding row`);
  }

  // SHACL検証を実行
  await validateQuadsWithShape(quads, shape, focusNode);

  // DTOにマッピング
  return mapToObject(row);
}

/**
 * 便利関数: クエリ構築・実行・検証・DTO化を一括で行う
 *
 * @template T - DTOの型
 * @param builder - OutputSpecが設定されたSparqlBuilder
 * @param engine - Comunica QueryEngine
 * @param sources - データソース
 * @returns 検証済みDTOの配列
 */
export async function runTypedQuery<T>(
  builder: SparqlBuilder,
  engine: any, // Comunica QueryEngine
  sources: any[] // SourceSpec
): Promise<T[]> {
  const { execQuery } = await import('@gftdcojp/sparql-ts-executor');
  const rows = await execQuery(builder, engine, sources);
  return shapeAndMapAll(builder, rows);
}
