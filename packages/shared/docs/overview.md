# Shared

The `@pixxl/shared` package contains contracts, schemas, and types shared between frontend and backend. This is the source of truth for API definitions and domain types.

## Purpose

Shared enables type-safe RPC communication between frontend and backend.

**What is shared**

- Same TypeScript types used by both frontend and backend
- Same Effect Schema definitions for validation
- Same oRPC contracts for procedure definitions

**How it works**

1. Contracts are defined in Shared package
2. Frontend imports contracts to create the client
3. Backend imports contracts to create the server
4. Both use identical schemas, ensuring type safety at compile time and runtime

## Stack

| Purpose           | Technology                |
| ----------------- | ------------------------- |
| Schema Definition | Effect Schema             |
| RPC Contracts     | oRPC                      |
| Type Inference    | TypeScript (from schemas) |

## How It Works

**Shared exposes three main things:**

1. **Schemas** — Define what data looks like and validates it
   - Input schemas for creating/updating things
   - Output schemas for responses
   - Shared types for common structures

2. **Contracts** — Define the API surface
   - Each contract specifies input and output schemas
   - Grouped by feature: project, agent, terminal, command, config
   - Both frontend and backend import the same contracts

3. **Router** — Assembles all contracts into a single object
   - Frontend uses it to build the client
   - Backend uses it to build the server
   - Guarantees both sides agree on the API

## Schema → Contract Flow

The chain from schema to contract:

1. **Schema (Effect)** — Defines structure and validation rules
2. **Type (inferred)** — TypeScript type extracted from schema
3. **Contract (oRPC)** — Procedure definition using the types

**Example chain**

- `CreateProjectInputSchema` → `CreateProjectInput` → `createProjectContract`

This ensures the contract only accepts data that passes schema validation.

## Contracts

Each contract defines:

- **Input schema**: What the client sends
- **Output schema**: What the server returns
- **Error schema**: What errors look like

```typescript
// From contracts/project.ts
export const createProjectContract = oc
  .input(CreateProjectInputSchema)
  .output(ProjectMetadataSchema);
```

## Router Assembly

All contracts are grouped into a router:

```typescript
// router.ts
export const routerContract = {
  config: { getConfig, updateConfig },
  project: { createProject, deleteProject, listProjects, ... },
  agent: { createAgent, updateAgent, ... },
  terminal: { createTerminal, connectTerminal, ... },
  command: { createCommand, deleteCommand, ... },
};
```

Both frontend and backend import from this router.

## Schema Patterns

### Input/Output Separation

```typescript
// Schema defines structure
export const CreateProjectInputSchema = Schema.Struct({ ... });
export const ProjectMetadataSchema = Schema.Struct({ ... });

// Type is inferred
export type CreateProjectInput = typeof CreateProjectInputSchema.Type;
export type ProjectMetadata = typeof ProjectMetadataSchema.Type;
```

### Transformations

```typescript
// Project name normalization
name: Schema.NonEmptyString.pipe(
  Schema.decodeTo(
    Schema.NonEmptyString,
    SchemaTransformation.transform({
      decode: projectNameRule, // Normalize on input
      encode: (val) => val, // Pass through on output
    }),
  ),
);
```

### Literals for Enums

```typescript
export const CursorStyle = Schema.Literals(["block", "underline", "bar"]);
```

## Error Contracts

Standard error structure used across all features:

```typescript
{
  error: {
    feature: string;    // "project", "terminal", etc
    code: string;       // "NOT_FOUND", "VALIDATION_ERROR", etc
    message: string;    // Human-readable
    details?: unknown;  // Feature-specific context
  }
}
```

## Services

The `entity-service.ts` provides generic CRUD patterns using Effect-TS:

```typescript
// Generic service interface for any entity
export interface EntityService<Entity, CreateInput, UpdateInput> {
  create: (input: CreateInput) => Effect<Entity, Error>;
  update: (id: string, input: UpdateInput) => Effect<Entity, Error>;
  delete: (id: string) => Effect<void, Error>;
  getById: (id: string) => Effect<Option<Entity>, Error>;
  list: () => Effect<ReadonlyArray<Entity>, Error>;
}
```

## Versioning

This package is versioned independently. Breaking changes to contracts require:

1. Major version bump in package.json
2. Coordinated update to both frontend and backend

## See Also

- [Frontend](../../../apps/frontend/docs/) — Consumer of these contracts
- [Backend](../../../apps/backend/docs/) — Implements these contracts
- [Ubiquitous Language](../../../docs/ubiquitous-language.md) — Domain terminology
