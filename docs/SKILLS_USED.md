# Skills Used

This document maps the agent skills utilized across the project's milestones, and explains why they were selected.

## Milestone Mapping

### Planning & Architecture
- **ai-agents-architect**: Used to design the cross-agent handoff state, identity mapping across tools, and conflict resolution gracefully.
- **llm-app-patterns**: Used to structure the RAG/hybrid retrieval pipeline and the LLM extraction abstraction (`@ai-sdk/core`).

### Phase 0: Prototype
- **M1 (Monorepo & Identity)**: `clean-code` and `test-driven-development` to establish robust TS/Drizzle schemas and identity boundaries.
- **M2 (Security & Audit)**: `ai-agents-architect` (for governance/permissioning) and `verification-before-completion` to rigorously test redaction interceptors before claiming the write path is secure.
- **M3 (Memory Core & Retrieval)**: `clean-code` to structure the Drizzle ORM hybrid search queries.
- **M4 (Extraction Spike)**: `llm-structured-output` to strictly format the extracted decisions/constraints from real transcripts, and `agent-evaluation` to establish the precision/recall thresholds and prompt-injection defense testing.
- **M5 (MCP Server & OAuth)**: `mcp-builder` is the core skill here, strictly following the TS SDK standards for remote (HTTP) and local (stdio) transports.
- **M6 (Handoff & Miners)**: `mcp-builder` to expose the handoff tools. `systematic-debugging` to reverse-engineer Claude Code and Codex log formats for the session miners.
- **M7 (Brief Gen & CLI)**: `clean-code` for building the CLI tool.
- **Phase 0 Exit Gate**: `verification-before-completion` and `executing-plans` to ensure we do not proceed until a real-client handoff from Claude Code to Codex succeeds.

### Phase 1: MVP
- **M8 (Context Assembly)**: `context-window-management` to design the packing logic with `tiktoken` to strictly adhere to context limits without truncating JSON payloads abruptly.
- **M9 & M10 (Web App)**: `ckm:ui-styling` and `ckm:design-system` to build the Next.js/shadcn frontend, ensuring a polished, enterprise-ready Proposal Inbox and Memory Explorer.
- **M11 (Eval Harness)**: `langfuse` (or general observability skills) and `agent-evaluation` to instrument the retrieval eval harness properly.

## Execution Discipline
- Throughout all milestones: `executing-plans` dictates step-by-step progress, `commit` enforces conventional PR hygiene, and `verification-before-completion` mandates that tests run successfully before closing a milestone.

## Skills Decided Not To Use
- **python-pro**: Swapped out in favor of TypeScript across the board, unifying the frontend and backend, and leveraging the excellent TS MCP SDK and Drizzle ORM.
- **docx/pdf/pptx/xlsx**: No current requirements for Office exports; memory management relies on markdown (`AGENTS.md`), JSON, and the Web UI.
