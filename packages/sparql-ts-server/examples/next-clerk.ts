/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/examples/" },
 *   "@id": "next-clerk",
 *   "role": "Next.js App Router route with Clerk v6 and authorization hooks",
 *   "dependsOn": [
 *     "@gftdcojp/sparql-ts-server",
 *     "@gftdcojp/sparql-ts-builder",
 *     "@clerk/nextjs/server",
 *     "zod"
 *   ]
 * }
 */

import { nextRouteHandler } from "@gftdcojp/sparql-ts-server/adapters/next";
import type { CreateServerOptions, QueryRegistry } from "@gftdcojp/sparql-ts-server";
import { SparqlBuilder, iri, v } from "@gftdcojp/sparql-ts-builder";
import { z } from "zod";
import { authorizeOperationByNamespace, authorizeRowByQuads } from "./policies.js";

// Example DTO & registry
const Person = z.object({ id: z.string(), name: z.string(), age: z.number().int() });

const registry: QueryRegistry = {
  "person.list": {
    params: z.object({ limit: z.number().int().min(1).max(100).default(10) }),
    resultItem: Person,
    build: (params) => {
      const b = new SparqlBuilder()
        .prefix("ex", "http://example.org/schema#")
        .selectVars([v("id"), v("name"), v("age")])
        .whereTriple(v("id"), iri("a"), iri("http://example.org/schema#Person"))
        .whereTriple(v("id"), iri("http://example.org/schema#name"), v("name"))
        .whereTriple(v("id"), iri("http://example.org/schema#age"), v("age"))
        .limit(params.limit);

      b.setOutputSpec({
        shape: "http://example.org/PersonShape",
        focusNodeVar: "id",
        buildQuads: (row) => [],
        mapToObject: (row) => ({
          id: row.get("id")!.value,
          name: row.get("name")!.value,
          age: Number(row.get("age")!.value),
        }),
      });

      return b;
    },
  },
};

// Clerk v6 integration sample
async function createOptions(): Promise<CreateServerOptions> {
  // Import lazily to keep library decoupled
  const { auth } = await import("@clerk/nextjs/server");
  const a = await auth();
  // Prefer explicit check over protect() to avoid API drift
  if (!a?.userId) {
    // In Next route, returning a Response is handled at adapter; here we throw
    const e = new Error("Unauthorized");
    (e as any).status = 401;
    throw e;
  }

  return {
    registry,
    authorizeOperation: async (input) => {
      // Attach clerk context
      (input.ctx as any).userId = a.userId ?? undefined;
      (input.ctx as any).tenantId = (a as any).orgId ?? a.userId ?? undefined;
      await authorizeOperationByNamespace(input);
    },
    authorizeRow: async (input) => {
      (input.ctx as any).userId = a.userId ?? undefined;
      (input.ctx as any).tenantId = (a as any).orgId ?? a.userId ?? undefined;
      await authorizeRowByQuads(input);
    },
  } satisfies CreateServerOptions;
}

// Next.js App Router route file example:
// export const { POST } = nextRouteHandler(await createOptions());


