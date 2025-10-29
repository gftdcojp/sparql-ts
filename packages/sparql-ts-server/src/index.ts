/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/" },
 *   "@id": "index",
 *   "role": "Public entrypoint exports"
 * }
 */

export { createSparqlServer } from "./server.js";
export type {
  QueryContext,
  QueryDef,
  QueryRegistry,
  CreateServerOptions,
  AuthorizeOperationInput,
  AuthorizeRowInput,
} from "./types.js";


