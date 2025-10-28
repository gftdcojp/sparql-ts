# @gftdcojp/sparql-ts

RDFデータソースに対して SPARQL クエリを安全に組み立て、実行し、セマンティックに正しい（SHACL準拠の）アプリケーション向けオブジェクトとして受け取るための TypeScript ファミリーです。

## 概要

`sparql-ts` は、RDFデータを扱うアプリケーション開発を支援するためのTypeScriptライブラリ群です。以下の3つのパッケージから構成されます：

- **[@gftdcojp/sparql-ts-builder](./packages/sparql-ts-builder/)**: SPARQLクエリの型安全な構築
- **[@gftdcojp/sparql-ts-executor](./packages/sparql-ts-executor/)**: SPARQLクエリの実行
- **[@gftdcojp/sparql-ts-shaper](./packages/sparql-ts-shaper/)**: 結果のSHACL検証とDTO化

各パッケージは明確な責任分離を持ち、SOLID原則に基づいた設計になっています。

## アーキテクチャ

```
          +-------------------------------------+
          | @gftdcojp/sparql-ts-builder         |
          |-------------------------------------|
          | - SparqlBuilder                     |
          | - RDF Term helpers (iri, v, etc)    |
          | - .toString()                       |
          | - setOutputSpec()/getOutputSpec()   |
          +-------------------------+-----------+
                                    |
                                    | (uses builder for query & spec)
                                    v
          +-------------------------------------+
          | @gftdcojp/sparql-ts-executor        |
          |-------------------------------------|
          | - execQuery(builder, engine, ...)   |
          | - collectRows(...)                  |
          | => AsyncIterable<BindingRow>        |
          +-------------------------+-----------+
                                    |
                                    | (BindingRow + builder.getOutputSpec())
                                    v
          +-------------------------------------+
          | @gftdcojp/sparql-ts-shaper          |
          |-------------------------------------|
          | - shapeAndMapAll(builder, rows)     |
          |   1) buildQuads(row)                |
          |   2) SHACL validate (resourcebox)   |
          |   3) mapToObject(row) => DTO        |
          | => Promise<T[]> (信頼できる配列)     |
          +-------------------------------------+
```

## インストール

```bash
# npm
npm install @gftdcojp/sparql-ts-builder @gftdcojp/sparql-ts-executor @gftdcojp/sparql-ts-shaper

# pnpm
pnpm add @gftdcojp/sparql-ts-builder @gftdcojp/sparql-ts-executor @gftdcojp/sparql-ts-shaper

# yarn
yarn add @gftdcojp/sparql-ts-builder @gftdcojp/sparql-ts-executor @gftdcojp/sparql-ts-shaper
```

## 基本的な使用例

```typescript
import { SparqlBuilder, iri, v, litStr } from '@gftdcojp/sparql-ts-builder';
import { execQuery } from '@gftdcojp/sparql-ts-executor';
import { shapeAndMapAll } from '@gftdcojp/sparql-ts-shaper';
import { QueryEngine } from '@comunica/query-sparql';

// 1. クエリ構築
const builder = new SparqlBuilder()
  .prefix('ex', 'http://example.org/schema#')
  .selectVars([v('id'), v('name'), v('age')])
  .whereTriple(v('id'), iri('a'), iri('http://example.org/schema#Person'))
  .whereTriple(v('id'), iri('http://example.org/schema#name'), v('name'))
  .whereTriple(v('id'), iri('http://example.org/schema#age'), v('age'))
  .limit(10);

// 2. 出力仕様設定（SHACL検証とDTOマッピング）
builder.setOutputSpec({
  shape: 'http://example.org/PersonShape',
  focusNodeVar: 'id',
  buildQuads: (binding) => [
    // RDFグラフを復元するロジック
  ],
  mapToObject: (binding) => ({
    id: binding.get('id')!.value,
    name: binding.get('name')!.value,
    age: Number(binding.get('age')!.value),
  }),
});

// 3. クエリ実行
const engine = new QueryEngine();
const rows = await execQuery(builder, engine, ['http://example.org/data.ttl']);

// 4. SHACL検証とDTO化
const persons = await shapeAndMapAll(builder, rows);
console.log(persons); // Person[] - 型安全でSHACL準拠
```

## パッケージ詳細

### @gftdcojp/sparql-ts-builder

SPARQLクエリの型安全な構築を提供します。

**主要API:**
- `SparqlBuilder`: fluent APIによるクエリ構築
- RDF Term helpers: `iri()`, `v()`, `litStr()`, etc.
- `OutputSpec<T>`: 出力仕様の定義

### @gftdcojp/sparql-ts-executor

SPARQLクエリの実行を提供します。

**主要API:**
- `execQuery(builder, engine, sources)`: クエリ実行
- `collectRows(builder, engine, sources)`: 全結果を配列として取得

### @gftdcojp/sparql-ts-shaper

クエリ結果のSHACL検証とDTO化を提供します。

**主要API:**
- `shapeAndMapAll(builder, rows)`: 全結果の検証・マッピング
- `shapeAndMapOne(builder, row)`: 単一結果の検証・マッピング

## 開発

```bash
# 依存関係インストール
pnpm install

# 全パッケージビルド
pnpm build

# 全パッケージテスト
pnpm test

# 個別パッケージの操作
cd packages/sparql-ts-builder
pnpm test
pnpm build
```

## 設計原則

- **責任分離**: 各パッケージは単一の責任のみを担う
- **型安全性**: TypeScriptの型システムを最大限活用
- **テスト容易性**: 各層が独立してテスト可能
- **拡張性**: 新しい機能の追加が容易

## 依存関係

- `sparqljs`: SPARQL AST操作
- `n3`: RDF Term操作
- `@rdfjs/types`: RDF/JS標準型定義
- `@comunica/query-sparql`: SPARQL実行エンジン
- `@gftdcojp/resourcebox`: SHACL検証（将来）

## ライセンス

このプロジェクトは [gftdco.jp](https://gftdco.jp) によって管理されています。
