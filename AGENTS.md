# pixxl

AI-powered local-first code workspace. React + TanStack Start frontend, Bun + Effect-TS backend.

## Quick Commands

```bash
# Install (after pulling changes)
vp install

# Run all checks (format, lint, type)
vp check

# Run tests
vp test
vp test --run src/some.test.ts    # single test file
vp test --run -t "test name"      # single test by name

# Dev servers
pnpm dev          # both frontend + backend
pnpm dev:frontend # frontend only (TanStack Start)
pnpm dev:backend  # backend only (Bun --hot)
```

## Project Structure

```
apps/
  frontend/    # TanStack Start SPA (see docs/overview.md)
  backend/     # Bun server (see docs/overview.md)
packages/
  shared/      # Effect schemas + oRPC contracts
```

## Key Tech

| Layer    | Stack                                                      |
| -------- | ---------------------------------------------------------- |
| Frontend | TanStack Start, TanStack Query/DB, Ghostty Terminal, Jotai |
| Backend  | Bun, Effect-TS, oRPC, XState                               |
| Shared   | Effect Schema, oRPC contracts                              |

## Module Docs

- [Architecture Overview](docs/overview.md)
- [Domain Language](docs/ubiquitous-language.md)
- [Frontend](apps/frontend/docs/overview.md)
- [Backend](apps/backend/docs/overview.md)
- [Shared](packages/shared/docs/overview.md)

## Constraints

- **Package manager**: Use `vp` commands, not pnpm/yarn directly
- **Schemas**: Effect Schema (not Zod) — see `packages/shared/src/schema/`
- **Imports**: Use `@/*` for internal, `@pixxl/shared` for shared
- **Style**: Enforced via `vp check` (oxlint + oxfmt + tsc)
