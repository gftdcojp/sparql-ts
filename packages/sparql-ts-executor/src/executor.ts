/**
 * @fileoverview SPARQLクエリ実行関数
 *
 * SparqlBuilderで構築したクエリをComunicaで実行し、バインディング結果を返します。
 */

import { QueryEngine } from '@comunica/query-sparql';
import type { Term } from '@rdfjs/types';
import type { SparqlBuilder, BindingRow } from '@gftdcojp/sparql-ts-builder';

/**
 * SPARQLデータソースの仕様
 * Comunicaが受け付ける形式
 */
export type SourceSpec = Array<string | { type: string; value: string }>;

/**
 * SparqlBuilderで構築したクエリをComunicaで実行し、
 * バインディング結果をAsyncIterableとして返します。
 *
 * @param builder - SPARQLクエリビルダー
 * @param engine - Comunica QueryEngine インスタンス
 * @param sources - SPARQLデータソースの配列
 * @returns バインディング行のAsyncIterable
 *
 * @example
 * ```ts
 * const engine = new QueryEngine();
 * const rows = await execQuery(builder, engine, ['http://example.org/data.ttl']);
 *
 * for await (const row of rows) {
 *   console.log(row.get('name')?.value);
 * }
 * ```
 */
export async function execQuery(
  builder: SparqlBuilder,
  engine: QueryEngine,
  sources: SourceSpec
): Promise<AsyncIterable<BindingRow>> {
  const sparql = builder.toString();

  try {
    const stream = await engine.queryBindings(sparql, { sources: sources as any });

    // AsyncIterable<BindingRow> として返す
    return (async function* () {
      for await (const binding of stream) {
        // ComunicaのBindingはMap-likeなので、BindingRowに変換
        const row: BindingRow = new Map();

        for (const [key, term] of binding) {
          // keyはVariableまたはstringの可能性がある
          const keyStr = typeof key === 'string' ? key : key.value;
          row.set(keyStr, term as Term);
        }

        yield row;
      }
    })();
  } catch (error) {
    throw new Error(`SPARQL query execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * SparqlBuilderで構築したクエリをComunicaで実行し、
 * 全てのバインディング結果を配列として収集して返します。
 *
 * @param builder - SPARQLクエリビルダー
 * @param engine - Comunica QueryEngine インスタンス
 * @param sources - SPARQLデータソースの配列
 * @returns バインディング行の配列
 *
 * @example
 * ```ts
 * const engine = new QueryEngine();
 * const allRows = await collectRows(builder, engine, ['http://example.org/data.ttl']);
 *
 * console.log(`Found ${allRows.length} results`);
 * ```
 */
export async function collectRows(
  builder: SparqlBuilder,
  engine: QueryEngine,
  sources: SourceSpec
): Promise<BindingRow[]> {
  const rows: BindingRow[] = [];
  const iterable = await execQuery(builder, engine, sources);

  for await (const row of iterable) {
    rows.push(row);
  }

  return rows;
}
