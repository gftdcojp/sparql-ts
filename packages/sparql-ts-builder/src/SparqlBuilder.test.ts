/**
 * @fileoverview SparqlBuilder のテスト
 */

import { describe, it, expect } from 'vitest';
import { SparqlBuilder } from './SparqlBuilder.js';
import { iri, v, litStr, XSD } from './terms.js';

describe('SparqlBuilder', () => {
  describe('基本的なクエリ構築', () => {
    it('シンプルなSELECTクエリを構築できる', () => {
      const qb = new SparqlBuilder()
        .prefix('ex', 'http://example.org/schema#')
        .selectVars([v('id'), v('name')])
        .whereTriple(v('id'), iri('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), iri('http://example.org/schema#Person'))
        .whereTriple(v('id'), iri('http://example.org/schema#name'), v('name'));

      const sparql = qb.toString();

      expect(sparql).toContain('PREFIX ex: <http://example.org/schema#>');
      expect(sparql).toContain('SELECT ?id ?name');
      expect(sparql).toContain('?id <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ex:Person');
      expect(sparql).toContain('?id ex:name ?name');
    });

    it('FILTER条件を追加できる', () => {
      const qb = new SparqlBuilder()
        .selectVars([v('id'), v('age')])
        .whereTriple(v('id'), iri('http://example.org/age'), v('age'))
        .filter('xsd:integer(?age) >= 18');

      const sparql = qb.toString();

      expect(sparql).toContain('FILTER(XSD:INTEGER(?AGE) >= 18())');
    });

    it('LIMITを設定できる', () => {
      const qb = new SparqlBuilder()
        .selectVars([v('id')])
        .whereTriple(v('id'), iri('a'), iri('http://example.org/Person'))
        .limit(10);

      const sparql = qb.toString();

      expect(sparql).toContain('LIMIT 10');
    });

    it('OPTIONALトリプルを追加できる', () => {
      const qb = new SparqlBuilder()
        .selectVars([v('id'), v('name')])
        .whereTriple(v('id'), iri('a'), iri('http://example.org/Person'))
        .optionalTriple(v('id'), iri('http://example.org/name'), v('name'));

      const sparql = qb.toString();

      expect(sparql).toContain('OPTIONAL {');
      expect(sparql).toContain('?id <http://example.org/name> ?name');
      expect(sparql).toContain('}');
    });
  });

  describe('OutputSpec', () => {
    it('OutputSpecを設定・取得できる', () => {
      const spec = {
        shape: 'http://example.org/PersonShape',
        focusNodeVar: 'id',
        buildQuads: () => [],
        mapToObject: () => ({ id: '', name: '' }),
      };

      const qb = new SparqlBuilder().setOutputSpec(spec);

      expect(qb.getOutputSpec()).toBe(spec);
    });

    it('OutputSpecが未設定の場合はundefinedを返す', () => {
      const qb = new SparqlBuilder();

      expect(qb.getOutputSpec()).toBeUndefined();
    });
  });

  describe('RDF Term ヘルパ', () => {
    it('iri() が NamedNode を作成する', () => {
      const node = iri('http://example.org/test');

      expect(node.termType).toBe('NamedNode');
      expect(node.value).toBe('http://example.org/test');
    });

    it('v() が Variable を作成する', () => {
      const variable = v('test');

      expect(variable.termType).toBe('Variable');
      expect(variable.value).toBe('test');
    });

    it('litStr() が Literal を作成する', () => {
      const literal = litStr('Hello World');

      expect(literal.termType).toBe('Literal');
      expect(literal.value).toBe('Hello World');
    });

    it('XSD 定数が利用できる', () => {
      expect(XSD.int.termType).toBe('NamedNode');
      expect(XSD.int.value).toBe('http://www.w3.org/2001/XMLSchema#int');
    });
  });
});
