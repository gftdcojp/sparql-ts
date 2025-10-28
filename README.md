# @gftdcojp/sparql-ts

A TypeScript family for safely building, executing SPARQL queries against RDF data sources, and receiving semantically correct (SHACL-compliant) objects for applications.

## Overview

`sparql-ts` is a collection of TypeScript libraries that support application development with RDF data. It consists of three packages:

- **[@gftdcojp/sparql-ts-builder](./packages/sparql-ts-builder/)**: Type-safe SPARQL query building
- **[@gftdcojp/sparql-ts-executor](./packages/sparql-ts-executor/)**: SPARQL query execution
- **[@gftdcojp/sparql-ts-shaper](./packages/sparql-ts-shaper/)**: SHACL validation and DTO mapping

Each package has clear separation of responsibilities and is designed based on SOLID principles.

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
import { QueryEngine } from '@comunica/query-sparql';

// 1. Build query
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

// 3. Execute query
const engine = new QueryEngine();
const rows = await execQuery(builder, engine, ['http://example.org/data.ttl']);

// 4. SHACL validation and DTO mapping
const persons = await shapeAndMapAll(builder, rows);
console.log(persons); // Person[] - type-safe and SHACL-compliant
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

- `sparqljs`: SPARQL AST manipulation
- `n3`: RDF Term operations
- `@rdfjs/types`: RDF/JS standard type definitions
- `@comunica/query-sparql`: SPARQL execution engine
- `@gftdcojp/resourcebox`: SHACL validation (future)

## License

This project is maintained by [gftdco.jp](https://gftdco.jp).
