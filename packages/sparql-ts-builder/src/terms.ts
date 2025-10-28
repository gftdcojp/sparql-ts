/**
 * @fileoverview RDF Term ヘルパ関数
 *
 * RDF/JS Terms を型安全に扱うためのヘルパ関数を提供します。
 * これらは NamedNode, Literal, Variable, BlankNode の型を返すことで、
 * トリプルパターンの安全性を保証します。
 */

import { DataFactory } from 'n3';
import type { NamedNode, Literal, Variable, BlankNode } from '@rdfjs/types';

const { namedNode, literal, variable, blankNode } = DataFactory;

/**
 * IRIを表す NamedNode を作成します。
 *
 * @param iri - IRI文字列
 * @returns NamedNode
 *
 * @example
 * ```ts
 * iri("http://example.org/schema#Person") // NamedNode
 * ```
 */
export function iri(iri: string): NamedNode {
  return namedNode(iri);
}

/**
 * 文字列リテラルを作成します。
 *
 * @param value - リテラル値
 * @param languageOrDatatype - 言語タグまたはデータ型（オプション）
 * @returns Literal
 *
 * @example
 * ```ts
 * litStr("Alice") // "Alice"
 * litStr("Hello", "en") // "Hello"@en
 * ```
 */
export function litStr(value: string, languageOrDatatype?: string | NamedNode): Literal {
  if (languageOrDatatype === undefined) {
    return literal(value);
  }
  if (typeof languageOrDatatype === 'string') {
    return literal(value, languageOrDatatype);
  }
  return literal(value, languageOrDatatype);
}

/**
 * 型付きリテラルを作成します。
 *
 * @param value - リテラル値
 * @param datatype - データ型
 * @returns Literal
 *
 * @example
 * ```ts
 * litTyped(42, XSD.int) // "42"^^xsd:int
 * ```
 */
export function litTyped(value: string | number | boolean, datatype: NamedNode): Literal {
  return literal(value.toString(), datatype);
}

/**
 * SPARQL変数を作成します。
 *
 * @param name - 変数名（$や?は含めない）
 * @returns Variable
 *
 * @example
 * ```ts
 * v("id") // ?id
 * ```
 */
export function v(name: string): Variable {
  return variable(name);
}

/**
 * ブランクノードを作成します。
 *
 * @param label - ブランクノードのラベル（オプション）
 * @returns BlankNode
 *
 * @example
 * ```ts
 * b("anon1") // _:anon1
 * ```
 */
export function b(label?: string): BlankNode {
  return blankNode(label);
}

// よく使うXSDデータ型
export const XSD = {
  string: iri('http://www.w3.org/2001/XMLSchema#string'),
  int: iri('http://www.w3.org/2001/XMLSchema#int'),
  integer: iri('http://www.w3.org/2001/XMLSchema#integer'),
  decimal: iri('http://www.w3.org/2001/XMLSchema#decimal'),
  float: iri('http://www.w3.org/2001/XMLSchema#float'),
  double: iri('http://www.w3.org/2001/XMLSchema#double'),
  boolean: iri('http://www.w3.org/2001/XMLSchema#boolean'),
  dateTime: iri('http://www.w3.org/2001/XMLSchema#dateTime'),
  date: iri('http://www.w3.org/2001/XMLSchema#date'),
} as const;
