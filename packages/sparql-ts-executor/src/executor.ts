/**
 * @fileoverview SPARQLクエリ実行関数
 *
 * SparqlBuilderで構築したクエリを@gftdcojp/grapherまたはComunicaで実行し、バインディング結果を返します。
 */

import type { Term } from '@rdfjs/types';
import type { SparqlBuilder, BindingRow } from '@gftdcojp/sparql-ts-builder';

// エンジンの種類を定義
type QueryEngineType = 'grapher' | 'comunica';

// 使用可能なエンジンをチェック
let availableEngine: QueryEngineType = 'comunica'; // デフォルトはComunica

// @gftdcojp/grapherが使用可能かをチェック
async function checkGrapherAvailability(): Promise<boolean> {
  try {
    await import('@gftdcojp/grapher/quick-start');
    return true;
  } catch (error) {
    return false;
  }
}

// 初期化時にエンジンの可用性をチェック
checkGrapherAvailability().then(available => {
  if (available) {
    availableEngine = 'grapher';
  }
});

// デフォルトのエンジンインスタンス
let defaultGrapherEngine: any = null;
let defaultComunicaEngine: any = null;

/**
 * デフォルトのクエリエンジンを取得（lazy initialization）
 */
async function getDefaultEngine() {
  if (availableEngine === 'grapher') {
    if (!defaultGrapherEngine) {
      try {
        const { createGrapher } = await import('@gftdcojp/grapher/quick-start');
        defaultGrapherEngine = await createGrapher({
          backend: 'duckdb', // デフォルトとしてDuckDBを使用
          dbPath: ':memory:', // メモリ内データベース
          tenantId: 'default',
          userId: 'default-user',
          enableOptimization: true,
        });
      } catch (error) {
        throw new Error(`Failed to create default GraphQueryEngine: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return defaultGrapherEngine;
  } else {
    if (!defaultComunicaEngine) {
      try {
        const { QueryEngine } = await import('@comunica/query-sparql');
        defaultComunicaEngine = new QueryEngine();
      } catch (error) {
        throw new Error(`Failed to create default Comunica QueryEngine: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return defaultComunicaEngine;
  }
}

/**
 * SPARQLデータソースの仕様
 * @gftdcojp/grapherが受け付ける形式（後方互換性のため保持）
 */
export type SourceSpec = Array<string | { type: string; value: string }>;

/**
 * SparqlBuilderで構築したクエリを実行し、
 * バインディング結果をAsyncIterableとして返します。
 *
 * @param builder - SPARQLクエリビルダー
 * @param engine - オプションのクエリエンジンインスタンス（指定しない場合はデフォルトを使用）
 * @param sources - SPARQLデータソースの配列
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
  engine?: any,
  sources?: SourceSpec
): Promise<AsyncIterable<BindingRow>> {
  const sparql = builder.toString();
  const queryEngine = engine || await getDefaultEngine();

  try {
    if (availableEngine === 'grapher' || (queryEngine && typeof queryEngine.query === 'function' && queryEngine.query.length >= 2)) {
      // @gftdcojp/grapherの場合
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
    } else {
      // Comunicaの場合
      const stream = await queryEngine.queryBindings(sparql, {
        sources: sources || []
      });

      // ComunicaのBindingはMap-likeなので、BindingRowに変換
      return (async function* () {
        for await (const binding of stream) {
          const row: BindingRow = new Map();

          // ComunicaのBindingオブジェクトからエントリを取得
          if (typeof binding.entries === 'function') {
            for (const [key, term] of binding.entries()) {
              const keyStr = typeof key === 'string' ? key : key.value;
              row.set(keyStr, term as Term);
            }
          } else if (binding instanceof Map) {
            for (const [key, term] of binding) {
              const keyStr = typeof key === 'string' ? key : key.value;
              row.set(keyStr, term as Term);
            }
          } else {
            // fallback: bindingが持つプロパティをイテレート
            for (const key in binding) {
              if (binding.hasOwnProperty(key)) {
                const term = (binding as any)[key];
                row.set(key, term as Term);
              }
            }
          }

          yield row;
        }
      })();
    }
  } catch (error) {
    console.error('SPARQL query execution failed:', {
      sparql,
      engine: availableEngine,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`SPARQL query execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * SparqlBuilderで構築したクエリを実行し、
 * 全てのバインディング結果を配列として収集して返します。
 *
 * @param builder - SPARQLクエリビルダー
 * @param engine - オプションのクエリエンジンインスタンス（指定しない場合はデフォルトを使用）
 * @param sources - SPARQLデータソースの配列
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
  engine?: any,
  sources?: SourceSpec
): Promise<BindingRow[]> {
  const rows: BindingRow[] = [];
  const iterable = await execQuery(builder, engine, sources);

  for await (const row of iterable) {
    rows.push(row);
  }

  return rows;
}
