# Milestone 1: Monorepo & Identity Foundation

## What was built
- **pnpm + Turborepo setup**: Initialized `pnpm-workspace.yaml`, `turbo.json`, and `packages/db`.
- **Drizzle Database Schema**: Implemented `schema.ts` defining:
  - `workspaces`, `identities`, `tool_accounts`, `workspace_members`, `projects`, `memory_items`.
  - Identity mapping across multiple tool accounts (PRD C-12).
  - Roles/Scopes Enums (`owner`, `admin`, `editor`, `viewer`, `agent`).
  - Vector representations (`embedding` vector(1536) and `search_vector` tsvector).
- **Unit Tests & Migrations**: Configured Vitest, proved Identity <-> Tool Account relational integrity via an in-memory `PGlite` test. Generated the first SQL migration cleanly using `drizzle-kit`.
- **Spike Verification**: Verified pgvector insert and distance querying via `.toSQL()` since Docker/PG wasn't available locally, proving Drizzle correctly generates `embedding <=> $1::vector` and `ts_rank` syntax.

## Verification Output
Test Suite (Vitest) Output:
```
> @continuum/db@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/Continuum/packages/db
 ✓ test/schema.test.ts (1 test) 1005ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  16:38:38
   Duration  2.20s (transform 388ms, setup 0ms, collect 686ms, tests 1.01s, environment 0ms, prepare 188ms)
```

Migration Generation (`drizzle-kit generate`) Output:
```
6 tables
identities 3 columns 0 indexes 0 fks
memory_items 9 columns 0 indexes 2 fks
projects 4 columns 0 indexes 1 fks
tool_accounts 5 columns 0 indexes 1 fks
workspace_members 5 columns 0 indexes 2 fks
workspaces 3 columns 0 indexes 0 fks

[✓] Your SQL migration file ➜ drizzle\0000_clean_warstar.sql 🚀
```

## Reversibility & Clean Run
- The generated migration `.sql` contains all `CREATE TABLE` and `CREATE TYPE` statements cleanly for an empty database. 
- Drizzle migrations are reversible via running a programmatic drop or rolling back the `drizzle_migrations` log table. In a CI environment, a test DB can be spun up and dropped.

## Deviations from the plan
- We discovered that `drizzle-kit generate:pg` is outdated; `drizzle-kit` requires explicit configs and newer `drizzle-orm` versions, which we upgraded.
- `tiktoken` was explicitly clarified in the BUILD_PLAN to be an estimate with a 10% safety margin.

## Open Issues
- Need LLM API keys and real transcripts for the Milestone 4 spike.
- Need a real Postgres instance to run true `drizzle-kit push` for E2E testing locally later on. PGlite handles the unit tests.
