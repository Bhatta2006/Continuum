# Milestone 7: Project Brief Generation & CLI Sync

## Goal
Generate the auto-maintained Project Brief (E-8). Build the `ctx init`/`ctx sync` CLI to write `AGENTS.md` to the local repo.

## Deliverables
- `packages/cli`
- Project Brief generation logic in `packages/mcp-server` (replacing the M5 stub) or `packages/memory-service`.
- `ctx init` and `ctx sync` commands in the CLI.

## Test Criteria
- CLI generates a valid markdown brief (`AGENTS.md`) matching DB state.
