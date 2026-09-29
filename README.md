# Continuum (v1)

Continuum is the context layer for AI-assisted product building. It provides an MCP server, CLI, and web dashboard allowing cross-agent memory, task handoff, and living context.

## Prerequisites
- Node.js >= 20
- pnpm >= 11
- PostgreSQL (when fully running)

## Setup in 15 minutes

1. **Clone and Install**
   ```bash
   pnpm install
   ```

2. **Generate Database Migrations**
   ```bash
   cd packages/db
   pnpm run db:generate
   ```

3. **Test the Database Schema**
   ```bash
   pnpm test
   ```
   *Note: This runs in-memory using PGlite. No local Postgres is required to run unit tests!*

4. **Build Everything**
   ```bash
   pnpm run build
   ```

## Architecture Overview
- `packages/db`: Drizzle ORM schema, identity mappings, vectors, and typed models.
- `packages/security`: Redaction pipeline, RBAC, and central agent permissions.

*(Additional apps and services will be added in upcoming milestones).*
