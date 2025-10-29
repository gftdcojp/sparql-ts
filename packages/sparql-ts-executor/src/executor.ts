/**
 * @fileoverview SPARQLクエリ実行関数
 *
 * SparqlBuilderで構築したクエリを@gftdcojp/grapherで実行し、バインディング結果を返します。
 */

import { createGrapher } from '@gftdcojp/grapher/quick-start';
import type { Term } from '@rdfjs/types';
import type { SparqlBuilder, BindingRow } from '@gftdcojp/sparql-ts-builder';

// デフォルトのGraphQueryEngineインスタンス
let defaultEngine: Awaited<ReturnType<typeof createGrapher>> | null = null;

/**
 * デフォルトのGraphQueryEngineを取得（lazy initialization）
 */
async function getDefaultEngine(): Promise<Awaited<ReturnType<typeof createGrapher>>> {
  if (!defaultEngine) {
    defaultEngine = await createGrapher({
      backend: 'duckdb', // デフォルトとしてDuckDBを使用
      dbPath: ':memory:', // メモリ内データベース
      tenantId: 'default',
      userId: 'default-user',
      enableOptimization: true,
    });
  }
  return defaultEngine;
}

/**
 * SPARQLデータソースの仕様
 * @gftdcojp/grapherが受け付ける形式（後方互換性のため保持）
 */
export type SourceSpec = Array<string | { type: string; value: string }>;

/**
 * SparqlBuilderで構築したクエリを@gftdcojp/grapherで実行し、
 * バインディング結果をAsyncIterableとして返します。
 *
 * @param builder - SPARQLクエリビルダー
 * @param engine - オプションのGraphQueryEngineインスタンス（指定しない場合はデフォルトを使用）
 * @param sources - SPARQLデータソースの配列（現在未使用、将来の拡張用）
 * @returns バインディング行のAsyncIterable
 *
 * @example
 * ```ts
 * const rows = await execQuery(builder);
 *
 * for await (const row of rows) {
 *   console.log(row.get('name')?.value);
 * }
 * ```
 */
export async function execQuery(
  builder: SparqlBuilder,
  engine?: Awaited<ReturnType<typeof createGrapher>>,
  _sources?: SourceSpec
): Promise<AsyncIterable<BindingRow>> {
  const sparql = builder.toString();
  const queryEngine = engine || await getDefaultEngine();

  try {
    const result = await queryEngine.query('sparql', sparql);

    // @gftdcojp/grapherの結果をBindingRow形式に変換
    return (async function* () {
      if (Array.isArray(result.data)) {
        // 結果が配列の場合
        for (const item of result.data) {
          if (item && typeof item === 'object') {
            const row: BindingRow = new Map();
            for (const [key, value] of Object.entries(item)) {
              // @gftdcojp/grapherの結果をTerm形式に変換
              row.set(key, {
                termType: typeof value === 'string' ? 'Literal' : 'NamedNode',
                value: String(value),
              } as Term);
            }
            yield row;
          }
        }
      } else if (result.data && typeof result.data === 'object') {
        // 単一オブジェクトの場合
        const row: BindingRow = new Map();
        for (const [key, value] of Object.entries(result.data)) {
          row.set(key, {
            termType: typeof value === 'string' ? 'Literal' : 'NamedNode',
            value: String(value),
          } as Term);
        }
        yield row;
      }
    })();
  } catch (error) {
    throw new Error(`SPARQL query execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * SparqlBuilderで構築したクエリを@gftdcojp/grapherで実行し、
 * 全てのバインディング結果を配列として収集して返します。
 *
 * @param builder - SPARQLクエリビルダー
 * @param engine - オプションのGraphQueryEngineインスタンス（指定しない場合はデフォルトを使用）
 * @param sources - SPARQLデータソースの配列（現在未使用、将来の拡張用）
 * @returns バインディング行の配列
 *
 * @example
 * ```ts
 * const allRows = await collectRows(builder);
 *
 * console.log(`Found ${allRows.length} results`);
 * ```
 */
export async function collectRows(
  builder: SparqlBuilder,
  engine?: Awaited<ReturnType<typeof createGrapher>>,
  _sources?: SourceSpec
): Promise<BindingRow[]> {
  const rows: BindingRow[] = [];
  const iterable = await execQuery(builder, engine, _sources);

  for await (const row of iterable) {
    rows.push(row);
  }

  return rows;
}
