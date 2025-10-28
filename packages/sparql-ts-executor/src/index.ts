/**
 * @fileoverview @gftdcojp/sparql-ts-executor
 *
 * SPARQLクエリの実行とバインディング結果の取得を提供します。
 */

// メインの実行関数
export { execQuery, collectRows, type SourceSpec } from './executor.js';

// builderパッケージの型を再エクスポート（利便性のため）
export type { BindingRow } from '@gftdcojp/sparql-ts-builder';
