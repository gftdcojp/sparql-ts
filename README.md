# @gftdcojp/sparql-ts

A TypeScript family for safely building, executing SPARQL queries against RDF data sources, and receiving semantically correct (SHACL-compliant) objects for applications.

## Overview

`sparql-ts` is a collection of TypeScript libraries that support application development with RDF data. It consists of three packages:

- **[@gftdcojp/sparql-ts-builder](./packages/sparql-ts-builder/)**: Type-safe SPARQL query building
- **[@gftdcojp/sparql-ts-executor](./packages/sparql-ts-executor/)**: SPARQL query execution with @gftdcojp/grapher
- **[@gftdcojp/sparql-ts-shaper](./packages/sparql-ts-shaper/)**: SHACL validation and DTO mapping

Each package has clear separation of responsibilities and is designed based on SOLID principles.

## Query Engine

This project uses **@gftdcojp/grapher** as the default query engine, with **Comunica** as a fallback:

### Primary Engine: @gftdcojp/grapher
> **Universal graph query engine with ISO GQL support**

- **5 Query Languages**: GraphQL, ISO GQL (⭐ International Standard), Cypher, SPARQL, Gremlin
- **3 Storage Backends**: Turso (SQLite), IndexedDB (Browser), DuckDB (Analytics)
- **Performance**: 52x faster after optimization (4,139ms → 79ms for 1000 records)
- **Zero Configuration**: Just 3 lines of code to get started

**Supported Languages:**
| Language | Standard | Status | Best For |
|----------|----------|--------|----------|
| **ISO GQL** ⭐ | ISO/IEC 39075:2024 | Parser ready | Future-proof international standard |
| **GraphQL** | Facebook | ✅ Production | Type-safe, frontend-friendly |
| **Cypher** | Neo4j | ✅ Production | Pattern matching, intuitive syntax |
| **SPARQL** | W3C | ✅ Production | RDF/Semantic Web, linked data |
| **Gremlin** | Apache TinkerPop | ✅ Production | Traversal-based, functional |

**Storage Options:**
| Backend | Type | Best For | Performance |
|---------|------|----------|-------------|
| **Turso** | SQLite | Production, edge deployments | 79ms (1K records) |
| **IndexedDB** | Browser | Client-side, offline-first | Browser-native |
| **DuckDB** | Analytics | OLAP, data analysis | 23ms (1K records) |

### Fallback Engine: Comunica
- **Comunica SPARQL Engine** - When @gftdcojp/grapher is unavailable
- **RDF/JS Compatible** - Standard RDF processing
- **Extensible** - Plugin-based architecture

The executor automatically detects engine availability and uses the appropriate one.

## Architecture

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
          | => Promise<T[]> (reliable array)    |
          +-------------------------------------+
```

## Installation

```bash
# npm
npm install @gftdcojp/sparql-ts-builder @gftdcojp/sparql-ts-executor @gftdcojp/sparql-ts-shaper

# pnpm
pnpm add @gftdcojp/sparql-ts-builder @gftdcojp/sparql-ts-executor @gftdcojp/sparql-ts-shaper

# yarn
yarn add @gftdcojp/sparql-ts-builder @gftdcojp/sparql-ts-executor @gftdcojp/sparql-ts-shaper
```

## Basic Usage Example

```typescript
import { SparqlBuilder, iri, v, litStr } from '@gftdcojp/sparql-ts-builder';
import { execQuery } from '@gftdcojp/sparql-ts-executor';
import { shapeAndMapAll } from '@gftdcojp/sparql-ts-shaper';

// 1. Build SPARQL query (or use GraphQL, Cypher, Gremlin, ISO GQL)
const builder = new SparqlBuilder()
  .prefix('ex', 'http://example.org/schema#')
  .selectVars([v('id'), v('name'), v('age')])
  .whereTriple(v('id'), iri('a'), iri('http://example.org/schema#Person'))
  .whereTriple(v('id'), iri('http://example.org/schema#name'), v('name'))
  .whereTriple(v('id'), iri('http://example.org/schema#age'), v('age'))
  .limit(10);

// 2. Set output specification (SHACL validation and DTO mapping)
builder.setOutputSpec({
  shape: 'http://example.org/PersonShape',
  focusNodeVar: 'id',
  buildQuads: (binding) => [
    // Logic to reconstruct RDF graph
  ],
  mapToObject: (binding) => ({
    id: binding.get('id')!.value,
    name: binding.get('name')!.value,
    age: Number(binding.get('age')!.value),
  }),
});

// 3. Execute query with @gftdcojp/grapher (automatic fallback to Comunica)
const rows = await execQuery(builder); // Uses @gftdcojp/grapher by default

// 4. SHACL validation and DTO mapping
const persons = await shapeAndMapAll(builder, rows);
console.log(persons); // Person[] - type-safe and SHACL-compliant
```

### Alternative: Direct @gftdcojp/grapher Usage

```typescript
import { createGrapher } from '@gftdcojp/grapher/quick-start';

// Zero-config setup with @gftdcojp/grapher
const grapher = await createGrapher();

// Query with GraphQL (recommended for performance)
const result = await grapher.query('graphql', `
  query {
    persons {
      id
      name
      age
    }
  }
`);

console.log(result.data);

// Or use SPARQL directly
const sparqlResult = await grapher.query('sparql', `
  PREFIX ex: <http://example.org/schema#>
  SELECT ?id ?name ?age
  WHERE {
    ?id a ex:Person .
    ?id ex:name ?name .
    ?id ex:age ?age .
  }
  LIMIT 10
`);

await grapher.disconnect();
```

## Package Details

### @gftdcojp/sparql-ts-builder

Provides type-safe SPARQL query building.

**Main APIs:**
- `SparqlBuilder`: Fluent API for query construction
- RDF Term helpers: `iri()`, `v()`, `litStr()`, etc.
- `OutputSpec<T>`: Output specification definition

### @gftdcojp/sparql-ts-executor

Provides SPARQL query execution.

**Main APIs:**
- `execQuery(builder, engine, sources)`: Query execution
- `collectRows(builder, engine, sources)`: Get all results as array

### @gftdcojp/sparql-ts-shaper

Provides SHACL validation and DTO mapping of query results.

**Main APIs:**
- `shapeAndMapAll(builder, rows)`: Validation and mapping of all results
- `shapeAndMapOne(builder, row)`: Validation and mapping of single result

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Test all packages
pnpm test

# Individual package operations
cd packages/sparql-ts-builder
pnpm test
pnpm build
```

## Design Principles

- **Separation of Concerns**: Each package has a single responsibility
- **Type Safety**: Maximum utilization of TypeScript's type system
- **Testability**: Each layer can be tested independently
- **Extensibility**: Easy to add new features

## Dependencies

### Core Query Engine
- `@gftdcojp/grapher`: Universal graph query engine (5 languages, 3 backends)
- `@comunica/query-sparql`: Fallback SPARQL execution engine

### SPARQL Processing
- `sparqljs`: SPARQL AST manipulation
- `@rdfjs/types`: RDF/JS standard type definitions

### Validation & Mapping (Future)
- `@gftdcojp/resourcebox`: SHACL validation and semantic processing

### Development & Testing
- `zod`: Type-safe schema validation
- `typescript`: Type-safe JavaScript
- `vitest`: Fast unit testing

## Related Projects

- [@gftdcojp/grapher](https://www.npmjs.com/package/@gftdcojp/grapher) - Universal graph query engine powering this executor
- [@gftdcojp/resourcebox](https://www.npmjs.com/package/@gftdcojp/resourcebox) - SHACL validation and semantic processing toolkit

## License

This project is maintained by [gftdco.jp](https://gftdco.jp).
