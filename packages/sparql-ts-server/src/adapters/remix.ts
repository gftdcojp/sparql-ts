/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/" },
 *   "@id": "adapters/remix",
 *   "role": "Remix adapter for SPARQL server",
 *   "dependsOn": ["@remix-run/node", "./../server"]
 * }
 */

import { createSparqlServer } from "../server.js";
import type { CreateServerOptions } from "../types.js";

export function remixAction(options: CreateServerOptions) {
  const server = createSparqlServer(options);
  return async ({ request }: { request: Request }) => server.handle(request);
}


