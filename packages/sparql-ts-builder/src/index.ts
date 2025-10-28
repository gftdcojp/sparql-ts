/**
 * @fileoverview @gftdcojp/sparql-ts-builder
 *
 * TypeScriptからSPARQLクエリを安全に組み立てるためのfluent APIを提供します。
 */

// RDF Term ヘルパ関数
export * from './terms.js';

// 型定義
export type { SubjectTerm, PredicateTerm, ObjectTerm, BindingRow, QuadData, OutputSpec } from './types.js';

// メインのビルダークラス
export { SparqlBuilder } from './SparqlBuilder.js';
