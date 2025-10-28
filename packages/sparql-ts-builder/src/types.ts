/**
 * @fileoverview 型定義
 *
 * SparqlBuilderと関連する型定義を提供します。
 */

import type { NamedNode, Literal, Variable, BlankNode, Term } from '@rdfjs/types';
import type { Quad } from '@rdfjs/types';

// RDF Term の種類を型安全に区別するための型
export type SubjectTerm = Variable | NamedNode | BlankNode;
export type PredicateTerm = Variable | NamedNode;
export type ObjectTerm = Variable | NamedNode | BlankNode | Literal;

// SPARQLバインディングの行（変数名 -> Term のマップ）
export type BindingRow = Map<string, Term>;

// RDFクアッド（トリプル + グラフ）
export type QuadData = Quad;

/**
 * 出力仕様: クエリ結果をSHACL検証し、DTOにマッピングするための情報
 *
 * @template T - DTOの型
 */
export interface OutputSpec<T> {
  /**
   * SHACL shape検証に使うShape定義
   * IRIまたはShapeオブジェクト
   */
  shape: string | NamedNode | object;

  /**
   * バリデーション対象になるノードを表す変数名
   * この変数の値がfocusNodeとしてSHACL検証される
   */
  focusNodeVar: string;

  /**
   * バインディング行からRDFローカルグラフを復元する関数
   * SHACL検証に使用されるクアッドを生成する
   *
   * @param binding - SPARQLクエリの結果行
   * @returns 検証対象のRDFクアッド配列
   */
  buildQuads(binding: BindingRow): QuadData[];

  /**
   * SHACL検証OKだったバインディング行をアプリ用DTOに変換する関数
   *
   * @param binding - SPARQLクエリの結果行
   * @returns アプリケーションで使用するDTO
   */
  mapToObject(binding: BindingRow): T;
}
