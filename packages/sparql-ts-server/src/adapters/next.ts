/**
 * json-ld
 * {
 *   "@context": { "@base": "https://gftdco.jp/sparql-ts-server/" },
 *   "@id": "adapters/next",
 *   "role": "Next.js App Router adapter for SPARQL server",
 *   "dependsOn": ["next/server", "./../server"]
 * }
 */

import { createSparqlServer } from "../server.js";
import type { CreateServerOptions } from "../types.js";

export function nextRouteHandler(options: CreateServerOptions) {
  const server = createSparqlServer(options);
  const POST = async (req: unknown) => server.handle(req as unknown as Request);
  return { POST };
}


