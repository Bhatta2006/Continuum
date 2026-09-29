# M1 Design Note: Identity & Monorepo Foundation

## Overview
This milestone establishes the base Turborepo/pnpm structure and the foundational Drizzle database schema.

## Monorepo Structure
We will use a standard `pnpm` workspace setup with Turborepo for fast builds.
- `packages/db`: Drizzle ORM schema, migrations, and typed queries.
- `apps/`: (Reserved for future MCP server and web app).

## Data Model & Identity (PRD C-12, T-1, T-2)
The schema must support cross-agent, cross-tool identity.

**Tables**:
- **Workspaces**: Top level container.
- **Identities**: A canonical actor (human or unified agent).
- **ToolAccounts**: (e.g. Claude Code on laptop A, ChatGPT account B) map N-to-1 to an `Identity`.
- **WorkspaceMembers**: Maps `Identity` to `Workspace` with a `Role` (Owner, Admin, Editor, Viewer, Agent).
- **Projects**: Sub-containers within a Workspace.
- **MemoryItems**: The atomic units of context.
  - Contains `scope` (private, project, team, org).
  - Contains `type` (decision, convention, etc.).
  - Contains `embedding` (vector) and `search_vector` (tsvector).

## Testing
We will configure Vitest and write a quick unit test checking the referential integrity definition of `ToolAccounts -> Identities` and ensuring `drizzle-kit` can generate the schema cleanly.
