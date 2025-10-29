/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/examples/" },
 *   "@id": "policies",
 *   "role": "Namespace & quad-based authorization policy templates",
 *   "dependsOn": ["@gftdcojp/sparql-ts-server", "zod"]
 * }
 */

import type {
  AuthorizeOperationInput,
  AuthorizeRowInput,
} from "../src/types.js";

// Sample: resolve allowed namespaces from tenant/user context
function getAllowedNamespaces(ctx: { tenantId?: string; userId?: string }) {
  // In real apps, fetch from DB/Config by tenantId
  // Fallback to example.org for demo
  const base = ctx.tenantId
    ? `https://data.example.com/${encodeURIComponent(ctx.tenantId)}/`
    : "http://example.org/";
  return [
    base,
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "http://www.w3.org/2000/01/rdf-schema#",
    "http://www.w3.org/2001/XMLSchema#",
  ];
}

export async function authorizeOperationByNamespace(
  input: AuthorizeOperationInput,
) {
  const { ctx, usedIris } = input;
  const allowed = getAllowedNamespaces(ctx);
  const isAllowed = (iri: string) => allowed.some(ns => iri.startsWith(ns));
  for (const iri of usedIris) {
    if (!isAllowed(iri)) {
      const e = new Error(`Forbidden namespace in query: ${iri}`);
      (e as any).status = 403;
      throw e;
    }
  }
}

export async function authorizeRowByQuads(
  input: AuthorizeRowInput,
) {
  const { ctx, quads } = input;
  const allowed = getAllowedNamespaces(ctx);
  const isAllowed = (iri: string) => allowed.some(ns => iri.startsWith(ns));
  for (const q of quads ?? []) {
    // predicate-level check
    if (q.predicate.termType === "NamedNode" && !isAllowed(q.predicate.value)) {
      const e = new Error(`Forbidden predicate: ${q.predicate.value}`);
      (e as any).status = 403;
      throw e;
    }
    // graph-level check (if NamedNode)
    if (q.graph?.termType === "NamedNode" && !isAllowed(q.graph.value)) {
      const e = new Error(`Forbidden graph: ${q.graph.value}`);
      (e as any).status = 403;
      throw e;
    }
  }
}


