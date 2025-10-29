/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/" },
 *   "@id": "util/ast",
 *   "role": "Utility to analyze sparqljs AST produced by SparqlBuilder",
 *   "dependsOn": ["@gftdcojp/sparql-ts-builder"]
 * }
 */

import type { SparqlBuilder } from "@gftdcojp/sparql-ts-builder";

function collectFromPatterns(patterns: any[], iris: Set<string>) {
  for (const p of patterns) {
    if (!p) continue;
    if (p.type === "bgp" && Array.isArray(p.triples)) {
      for (const t of p.triples) {
        for (const term of [t.subject, t.predicate, t.object]) {
          if (term && term.termType === "NamedNode" && typeof term.value === "string") {
            iris.add(term.value);
          }
        }
      }
    } else if (p.type === "optional" && Array.isArray(p.patterns)) {
      collectFromPatterns(p.patterns, iris);
    } else if (Array.isArray(p.patterns)) {
      collectFromPatterns(p.patterns, iris);
    }
  }
}

export function analyzeBuilder(builder: SparqlBuilder): {
  ast: any;
  usedIris: string[];
  prefixes: Record<string, string>;
} {
  const ast = builder.toSparqlAst() as any;
  const used = new Set<string>();
  const where = Array.isArray(ast.where) ? ast.where : [];
  collectFromPatterns(where, used);
  const prefixes: Record<string, string> = ast.prefixes || {};
  return { ast, usedIris: Array.from(used), prefixes };
}


