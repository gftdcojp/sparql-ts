{
  "@context": {
    "@base": "https://gftdco.jp/sparql-ts/",
    "owl": "http://www.w3.org/2002/07/owl#",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "sh": "http://www.w3.org/ns/shacl#",
    "process": "https://gftdco.jp/process/",
    "sparql": "https://gftdco.jp/sparql-ts/",
    "builder": "https://gftdco.jp/sparql-ts-builder/",
    "executor": "https://gftdco.jp/sparql-ts-executor/",
    "shaper": "https://gftdco.jp/sparql-ts-shaper/"
  },

  "@graph": [
    // プロジェクト全体のMerkle DAG
    {
      "@id": "sparql:project",
      "@type": "process:Project",
      "process:name": "sparql-ts Monorepo",
      "process:description": "RDFデータソースに対してSPARQLクエリを安全に組み立て、実行し、SHACL準拠のアプリケーション向けオブジェクトとして受け取るためのTypeScriptファミリー",
      "process:dependencies": ["builder:package", "executor:package", "shaper:package"],
      "process:architecture": {
        "@type": "process:LayeredArchitecture",
        "process:layers": [
          {
            "@id": "sparql:builder-layer",
            "@type": "process:Layer",
            "process:name": "Query Builder Layer",
            "process:responsibility": "SPARQLクエリの型安全な構築",
            "process:authority": "RDF/JS Termsを扱い、ASTを保持し、クエリ文字列を生成する",
            "process:forbidden": "通信なし、SHACL検証なし",
            "process:dependencies": []
          },
          {
            "@id": "sparql:executor-layer",
            "@type": "process:Layer",
            "process:name": "Query Executor Layer",
            "process:responsibility": "SPARQLクエリを実行し、バインディング結果を取得する",
            "process:authority": "ComunicaなどのSPARQLエンジンへのクエリアクセス",
            "process:forbidden": "ビジネス的な型付け／SHACL検証はしない",
            "process:dependencies": ["sparql:builder-layer"]
          },
          {
            "@id": "sparql:shaper-layer",
            "@type": "process:Layer",
            "process:name": "Result Shaper Layer",
            "process:responsibility": "クエリ結果をSHACLで検証し、安全なアプリ用DTOに射影する",
            "process:authority": "@gftdcojp/resourceboxのSHACL validatorを使用",
            "process:forbidden": "クエリ構築はしない／SPARQLエンジンは直接叩かない",
            "process:dependencies": ["sparql:builder-layer", "sparql:executor-layer"]
          }
        ]
      }
    },

    // Builder Package
    {
      "@id": "builder:package",
      "@type": "process:Package",
      "process:name": "@gftdcojp/sparql-ts-builder",
      "process:purpose": "TypeScriptからSPARQLクエリを安全に組み立てるためのfluent API",
      "process:exports": [
        "SparqlBuilder",
        "RDF Term helpers (iri, v, litStr, etc)",
        "OutputSpec interface"
      ],
      "process:dependencies": ["sparqljs", "n3", "@rdfjs/types"],
      "process:implementation": {
        "@type": "process:ImplementationPlan",
        "process:steps": [
          "RDF Term ヘルパ関数の実装",
          "SparqlBuilderクラスの実装",
          "OutputSpecインターフェースの定義",
          "SPARQL AST生成と文字列変換"
        ]
      }
    },

    // Executor Package
    {
      "@id": "executor:package",
      "@type": "process:Package",
      "process:name": "@gftdcojp/sparql-ts-executor",
      "process:purpose": "SPARQLクエリの実行とバインディング結果の取得",
      "process:exports": ["execQuery", "collectRows"],
      "process:dependencies": ["@gftdcojp/sparql-ts-builder", "@comunica/query-sparql", "@rdfjs/types"],
      "process:implementation": {
        "@type": "process:ImplementationPlan",
        "process:steps": [
          "Comunica統合の実装",
          "execQuery関数の実装",
          "collectRowsヘルパーの実装",
          "BindingRow型の定義"
        ]
      }
    },

    // Shaper Package
    {
      "@id": "shaper:package",
      "@type": "process:Package",
      "process:name": "@gftdcojp/sparql-ts-shaper",
      "process:purpose": "クエリ結果のSHACL検証とDTO化",
      "process:exports": ["shapeAndMapAll"],
      "process:dependencies": ["@gftdcojp/sparql-ts-builder", "@gftdcojp/sparql-ts-executor", "@gftdcojp/resourcebox"],
      "process:implementation": {
        "@type": "process:ImplementationPlan",
        "process:steps": [
          "SHACL検証統合の実装",
          "shapeAndMapAll関数の実装",
          "DTOマッピングの実装",
          "エラーハンドリング"
        ]
      }
    },

    // プロセスネットワークの実行順序（トポロジカルソート）
    {
      "@id": "sparql:execution-order",
      "@type": "process:TopologicalSort",
      "process:order": [
        "builder:package",
        "executor:package",
        "shaper:package",
        "sparql:integration-test"
      ]
    },

    // 統合テスト
    {
      "@id": "sparql:integration-test",
      "@type": "process:Test",
      "process:name": "Integration Test",
      "process:description": "3パッケージの統合動作確認",
      "process:dependencies": ["builder:package", "executor:package", "shaper:package"],
      "process:steps": [
        "サンプルRDFデータの準備",
        "クエリ構築→実行→検証のフローテスト",
        "SHACL shape準拠の確認",
        "DTO変換の確認"
      ]
    }
  ]
}
