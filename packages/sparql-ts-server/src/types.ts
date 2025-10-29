/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/" },
 *   "@id": "types",
 *   "role": "Public types for SPARQL TS Server",
 *   "dependsOn": [
 *     "@gftdcojp/sparql-ts-builder",
 *     "zod"
 *   ]
 * }
 */

import type { SparqlBuilder, BindingRow } from "@gftdcojp/sparql-ts-builder";
import type { Quad } from "@rdfjs/types";
import type { SourceSpec } from "@gftdcojp/sparql-ts-executor";
import { z, type ZodTypeAny } from "zod";

export type QueryContext = {
  tenantId?: string;
  userId?: string;
  request: Request;
  // 任意の認証プロバイダのコンテキスト（Clerkなど）を格納する拡張ポイント
  authContext?: unknown;
};

export interface QueryDef<TParams, TResultItem = unknown> {
  params: ZodTypeAny; // z.ZodType<TParams>
  resultItem: z.ZodType<TResultItem>;
  build: (params: TParams, ctx: QueryContext) => SparqlBuilder;
}

export type QueryRegistry = Record<string, QueryDef<any, any>>;

export const RequestEnvelope = z.object({
  operation: z.string().min(1),
  params: z.unknown().optional(),
});
export type RequestEnvelope = z.infer<typeof RequestEnvelope>;

export const ErrorEnvelope = z.object({
  error: z.object({
    name: z.string(),
    message: z.string(),
    issues: z.unknown().optional(),
  }),
  meta: z.object({ operation: z.string().optional() }).optional(),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export function SuccessEnvelope<T>(schema: z.ZodType<T>) {
  return z.object({ data: schema, meta: z.object({ operation: z.string() }) });
}

export type AuthorizeOperationInput = {
  ctx: QueryContext;
  operation: string;
  params: unknown;
  ast: any;
  usedIris: string[];
  prefixes: Record<string, string>;
};

export type AuthorizeRowInput = {
  ctx: QueryContext;
  operation: string;
  params: unknown;
  row: BindingRow;
  quads?: Quad[];
  ast: any;
  usedIris: string[];
  prefixes: Record<string, string>;
};

export type CreateServerOptions = {
  registry: QueryRegistry;
  engine?: any;
  sources?: SourceSpec;
  authorizeOperation?: (input: AuthorizeOperationInput) => Promise<void> | void;
  authorizeRow?: (input: AuthorizeRowInput) => Promise<void> | void;
  logger?: (e: unknown) => void;
};


