/**
 * @fileoverview SparqlBuilder クラス
 *
 * SPARQLクエリを型安全に組み立てるためのfluent APIを提供します。
 * Prisma/Drizzle風のインターフェースで、RDF/JS Termsを安全に扱えます。
 */

import type { SelectQuery } from 'sparqljs';
import { Generator } from 'sparqljs';
import type { NamedNode, Literal, Variable, BlankNode } from '@rdfjs/types';
import type { SubjectTerm, PredicateTerm, ObjectTerm, OutputSpec } from './types.js';

// sparqljs の Generator インスタンス
const generator = new Generator();

/**
 * SPARQL SELECT クエリを型安全に組み立てるビルダークラス
 *
 * @example
 * ```ts
 * const qb = new SparqlBuilder()
 *   .prefix("ex", "http://example.org/schema#")
 *   .selectVars([v("id"), v("name"), v("age")])
 *   .whereTriple(v("id"), iri("a"), ex("Person"))
 *   .whereTriple(v("id"), ex("name"), v("name"))
 *   .whereTriple(v("id"), ex("age"), v("age"))
 *   .limit(10);
 *
 * console.log(qb.toString());
 * ```
 */
export class SparqlBuilder {
  private prefixes: Record<string, string> = {};
  private variables: Variable[] = [];
  private wherePatterns: Array<{
    type: 'triple';
    subject: SubjectTerm;
    predicate: PredicateTerm;
    object: ObjectTerm;
    optional?: boolean;
  }> = [];
  private filters: string[] = [];
  private limitValue?: number;
  private outputSpec?: OutputSpec<any>;

  /**
   * プレフィックスを追加します。
   *
   * @param short - 短縮名
   * @param iri - IRI文字列
   * @returns this
   */
  prefix(short: string, iri: string): this {
    this.prefixes[short] = iri;
    return this;
  }

  /**
   * SELECTする変数を設定します。
   *
   * @param vars - 選択する変数の配列
   * @returns this
   */
  selectVars(vars: Variable[]): this {
    this.variables = vars;
    return this;
  }

  /**
   * WHERE句にトリプルパターンを追加します。
   *
   * @param subject - 主語
   * @param predicate - 述語
   * @param object - 目的語
   * @returns this
   */
  whereTriple(subject: SubjectTerm, predicate: PredicateTerm, object: ObjectTerm): this {
    this.wherePatterns.push({
      type: 'triple',
      subject,
      predicate,
      object,
    });
    return this;
  }

  /**
   * WHERE句にOPTIONALのトリプルパターンを追加します。
   *
   * @param subject - 主語
   * @param predicate - 述語
   * @param object - 目的語
   * @returns this
   */
  optionalTriple(subject: SubjectTerm, predicate: PredicateTerm, object: ObjectTerm): this {
    this.wherePatterns.push({
      type: 'triple',
      subject,
      predicate,
      object,
      optional: true,
    });
    return this;
  }

  /**
   * FILTER条件を追加します。
   *
   * @param expr - SPARQL FILTER式（文字列）
   * @returns this
   */
  filter(expr: string): this {
    this.filters.push(expr);
    return this;
  }

  /**
   * LIMITを設定します。
   *
   * @param n - 制限数
   * @returns this
   */
  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  /**
   * 出力仕様を設定します。
   * これにより、後段のSHACL検証とDTOマッピングが可能になります。
   *
   * @template T - DTOの型
   * @param spec - 出力仕様
   * @returns this
   */
  setOutputSpec<T>(spec: OutputSpec<T>): this {
    this.outputSpec = spec;
    return this;
  }

  /**
   * 設定された出力仕様を取得します。
   *
   * @template T - DTOの型
   * @returns 出力仕様、未設定の場合はundefined
   */
  getOutputSpec<T>(): OutputSpec<T> | undefined {
    return this.outputSpec;
  }

  /**
   * 現在のクエリをsparqljsのAST形式で取得します。
   *
   * @returns sparqljs SelectQuery AST
   */
  toSparqlAst(): SelectQuery {
    const query: SelectQuery = {
      type: 'query',
      queryType: 'SELECT',
      variables: this.variables.map(v => v), // Variableオブジェクトを直接使用
      where: [],
      prefixes: this.prefixes,
    };

    // WHERE句の構築
    for (const pattern of this.wherePatterns) {
      const triple = {
        type: 'bgp' as const,
        triples: [{
          subject: this.termToSparqlJs(pattern.subject),
          predicate: this.termToSparqlJs(pattern.predicate),
          object: this.termToSparqlJs(pattern.object),
        }],
      };

      if (pattern.optional) {
        query.where!.push({
          type: 'optional',
          patterns: [triple],
        });
      } else {
        query.where!.push(triple);
      }
    }

    // FILTER条件の追加
    for (const filterExpr of this.filters) {
      query.where!.push({
        type: 'filter',
        expression: {
          type: 'operation',
          operator: filterExpr,
          args: [],
        },
      });
    }

    // LIMITの設定
    if (this.limitValue !== undefined) {
      query.limit = this.limitValue;
    }

    return query;
  }

  /**
   * 現在のクエリをSPARQL文字列として取得します。
   *
   * @returns SPARQLクエリ文字列
   */
  toString(): string {
    return generator.stringify(this.toSparqlAst());
  }

  /**
   * RDF/JS Term を sparqljs AST 形式に変換します。
   *
   * @private
   * @param term - RDF/JS Term
   * @returns sparqljs AST term
   */
  private termToSparqlJs(term: NamedNode | Literal | Variable | BlankNode): any {
    switch (term.termType) {
      case 'NamedNode':
        return { termType: 'NamedNode', value: term.value };
      case 'Literal':
        return {
          termType: 'Literal',
          value: term.value,
          language: term.language,
          datatype: term.datatype ? { termType: 'NamedNode', value: term.datatype.value } : undefined,
        };
      case 'Variable':
        return term; // Variableはそのまま
      case 'BlankNode':
        return { termType: 'BlankNode', value: term.value };
      default:
        throw new Error(`Unsupported term type: ${(term as any).termType}`);
    }
  }
}
