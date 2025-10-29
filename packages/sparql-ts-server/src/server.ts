/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/" },
 *   "@id": "server",
 *   "role": "Fetch API compatible SPARQL endpoint core with Zod-only contracts",
 *   "dependsOn": [
 *     "@gftdcojp/sparql-ts-builder",
 *     "@gftdcojp/sparql-ts-executor",
 *     "@gftdcojp/sparql-ts-shaper",
 *     "zod"
 *   ]
 * }
 */

import { z } from "zod";
import { execQuery } from "@gftdcojp/sparql-ts-executor";
import { shapeAndMapOne } from "@gftdcojp/sparql-ts-shaper";
import type { BindingRow } from "@gftdcojp/sparql-ts-builder";
import { analyzeBuilder } from "./util/ast.js";
import {
  RequestEnvelope,
  SuccessEnvelope,
  ErrorEnvelope,
  type CreateServerOptions,
} from "./types.js";

export function createSparqlServer(options: CreateServerOptions) {
  const { registry, authorizeOperation, authorizeRow, engine, sources, logger } = options;

  async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: { name: "MethodNotAllowed", message: "Use POST" } }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    let op = "";
    try {
      const json = await request.json();
      const env = RequestEnvelope.parse(json);
      op = env.operation;

      const def = registry[env.operation];
      if (!def) {
        return jsonError(404, "OperationNotFound", `Unknown operation: ${env.operation}`, { operation: env.operation });
      }

      // Params validation
      const params = def.params.parse(env.params ?? {});
      const ctx = { request } as const;

      // Build query
      const builder = def.build(params, ctx);
      const { ast, usedIris, prefixes } = analyzeBuilder(builder);

      // Operation-level authorization (namespace/prefix based, etc.)
      if (authorizeOperation) {
        await authorizeOperation({ ctx, operation: env.operation, params, ast, usedIris, prefixes });
      }

      // Execute query to rows
      const rows = await execQuery(builder, engine, sources);

      // OutputSpec is required for typed mapping
      const spec = builder.getOutputSpec<any>();
      if (!spec) {
        throw new Error("OutputSpec must be set on SparqlBuilder to serve typed endpoint");
      }

      const results: any[] = [];
      for await (const row of rows as AsyncIterable<BindingRow>) {
        try {
          // Build quads for per-row authorization (quad-based control)
          const quads = spec.buildQuads(row);
          if (authorizeRow) {
            await authorizeRow({ ctx, operation: env.operation, params, row, quads, ast, usedIris, prefixes });
          }
          // Validate and map one row
          const dto = await shapeAndMapOne<any>(builder, row);
          results.push(dto);
        } catch (e) {
          // Skip unauthorized or invalid rows silently; log if needed
          const log = logger ?? (() => {});
          log(e);
          continue;
        }
      }

      // Final response validation (Zod)
      const arraySchema = def.resultItem.array();
      const parsed = arraySchema.parse(results);
      const body = SuccessEnvelope(arraySchema).parse({ data: parsed, meta: { operation: env.operation } });

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      const issues = e instanceof z.ZodError ? e.issues : undefined;
      const hinted = typeof (e as any)?.status === "number" ? (e as any).status as number : undefined;
      const status = e instanceof z.ZodError ? 400 : hinted ?? 500;
      /* c8 ignore next */
      const name = e instanceof z.ZodError ? "ValidationError" : "ServerError";
      const message = e instanceof Error ? e.message : String(e);
      const log = logger ?? (() => {});
      log(e);
      return jsonError(status, name, message, { operation: op }, issues);
    }
  }

  function jsonError(status: number, name: string, message: string, meta?: Record<string, unknown>, issues?: unknown) {
    const payload = ErrorEnvelope.parse({ error: { name, message, issues }, meta });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  return { handle };
}


