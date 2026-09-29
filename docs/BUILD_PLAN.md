# Continuum Build Plan

## 1. Tech Stack Recommendation

**Stack**: TypeScript Monorepo (Node.js, Fastify, Drizzle ORM, React, Next.js, shadcn/ui)

**Reasoning & Trade-offs**:
- **Monorepo Tooling**: pnpm + Turborepo for fast, strict workspace management.
- **TypeScript**: The official Model Context Protocol (MCP) TypeScript SDK is mature and allows sharing types (Schemas, MCP Tools) across the backend and frontend.
- **Backend / MCP Server**: Fastify + Node.js. Efficient for HTTP streaming, adaptable for stdio.
- **Database & ORM**: PostgreSQL with `pgvector`. Instead of Prisma (which has limited raw SQL/pgvector hybrid search ergonomics), we will use **Drizzle ORM** for full type-safety while retaining first-class support for pgvector and complex hybrid retrieval SQL queries.
- **LLM Abstraction & Token Counting**: We will use the Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) to abstract LLM providers (allowing swapping OpenAI/Anthropic). We will use `tiktoken` wrapped behind an interface for token-budgeting. *Note: `tiktoken` is an OpenAI tokenizer and only approximates other models. Counts will be treated as estimates and a safety margin (default 10%) will be applied in context assembly.*
- **Testing**: Vitest (Unit/Integration). Playwright (E2E). Real-client integration tests for Claude Code and Codex.

## 2. High-Level Architecture

Matches PRD Section 8.

```
[Claude Code / Codex / Chatbots] 
            │ (MCP HTTP + OAuth / stdio / CLI)
            ▼
┌───────────────────────────────────────────┐
│           Continuum API Gateway           │
│ (Auth, Identity, Redaction, Audit, Roles) │
└──────────────────┬────────────────────────┘
                   │
    ┌──────────────┼────────────────┬──────────────────┐
┌───▼────────┐ ┌───▼───────────┐ ┌──▼───────────────┐┌─▼──────────────┐
│ Extraction │ │ Memory Engine │ │ Context Assembly ││ Handoff Service│
│ (AI SDK)   │ │ (Graph, Drizzle)│ │ (tiktoken limit) ││ (Task Capsules)│
└────────────┘ └───────────────┘ └──────────────────┘└────────────────┘
                   │
             ┌─────▼───────────┐
             │ PostgreSQL (DB) │ (Memory Items, Vectors, Audit Log)
             └─────────────────┘
```

## 3. Milestone Breakdown

### Phase 0: Prototype

**Milestone 1: Monorepo & Identity Foundation (P0)**
- **Goal**: Setup pnpm + Turborepo. Initialize PostgreSQL + Drizzle ORM schema. Implement Identity mapping across multiple tool accounts (C-12), Workspace, Project, Memory Item, and Roles/Scopes (T-1, T-2).
- **Deliverables**: `db` package with Drizzle schema and migrations. Monorepo CI.
- **Test Criteria**: Unit tests for schema and identity mappings.

**Milestone 2: Security, Governance & Audit (P0)**
- **Goal**: Secure every write path from the start. Implement secret/PII redaction, append-only audit logging, and agent permission checks (G-4).
- **Deliverables**: Security middleware/interceptors.
- **Test Criteria**: Interceptors reject or redact AWS keys/PII. Audit log captures actor identity correctly.

**Milestone 3: Memory Core, Retrieval & Conflict Detection (P0)**
- **Goal**: Implement CRUD, semantic deduplication (E-3), and hybrid retrieval (R-2) using Drizzle + pgvector. Implement supersession and active conflict detection (L-2).
- **Deliverables**: `memory-service` module.
- **Test Criteria**: Hybrid search correctly ranks exact keyword matches and semantic matches. Conflicting facts trigger the conflict detection logic.

- **Goal**: Build the extraction engine using the `ai` package (Vercel AI SDK) plus provider packages (e.g. `@ai-sdk/openai`). Use real session transcripts to extract constraints and decisions. Implement prompt-injection defenses (G-8) quarantining malicious instructions.
- **Decision Gate**: Go/no-go on extraction viability.
- **Test Criteria**: Automated eval reporting **Precision > 80%** (ensure we don't pollute memory) and **Recall > 60%** (missing a fact is better than hallucinating one) on a dataset of real transcripts + injection samples. Injection samples must be successfully quarantined.

**Milestone 5: MCP Server Base & OAuth (P0)**
- **Goal**: Build the remote MCP server with OAuth, and local MCP server with stdio. Expose `memory.search` and `memory.propose` tools.
- **Deliverables**: `mcp-server` app.
- **Test Criteria**: Authenticated connections work for remote.

**Milestone 6: Handoff Service & Session Miners (P0)**
- **Goal**: Implement Task Capsules for context continuity. Add `handoff.checkpoint` and `resume`. Implement session miners for Claude Code and Codex (C-7).
- **Deliverables**: Handoff API and log miners.
- **Test Criteria**: State can be serialized and deserialized via API.

**Milestone 7: Project Brief Generation & CLI Sync (P0)**
- **Goal**: Generate the auto-maintained Project Brief (E-8). Build the `ctx init`/`ctx sync` CLI to write `AGENTS.md` to the local repo.
- **Deliverables**: `cli` package.
- **Test Criteria**: CLI generates a valid markdown brief matching DB state.

**Phase 0 Exit Gate**
- **Criteria**: "Handoff from Claude Code to Codex works on a real project."
- **Testing**: Real-client compatibility tests. We will boot a local MCP server, run a task in Claude Code, checkpoint it, and resume it in Codex successfully. No mocked clients for this gate.

### Phase 1: MVP

**Milestone 8: Token-Budgeted Context Assembly (P1)**
- **Goal**: Build `context.assemble` using `tiktoken` to dynamically pack the Brief, retrieved memory items, and Task Capsule under strict budget limits.
- **Test Criteria**: Output token count rigorously respects limits.

**Milestone 9: Web App - Auth, Workspaces & Memory Explorer (P1)**
- **Goal**: Build Next.js (App Router) + shadcn/ui. Implement user login, project selection, and Memory Explorer.
- **Test Criteria**: Playwright E2E for navigation and search rendering.

**Milestone 10: Web App - Proposal Inbox & Conflict Resolution (P1)**
- **Goal**: UI to accept/reject proposed memories, and to merge conflicting facts (supersession).
- **Test Criteria**: E2E test simulating a user accepting a proposal and resolving a conflict.

**Milestone 11: Health Dashboard & Eval Harness (P1)**
- **Goal**: Build the retrieval eval harness (`docs/evals.md`) and a dashboard view for memory health (stale count, coverage).
- **Test Criteria**: Eval harness runs end-to-end and computes baseline metrics.

## 4. Risk List & Mitigations

1. **Extraction Quality (High)**: Addressed by Milestone 4 spike using real data and strict precision/recall thresholds.
2. **Security & Injection (Critical)**: Addressed by Milestone 2 (early redaction/audit) and Milestone 4 (injection quarantines).
3. **Prisma pgvector limitations (Medium)**: Addressed by switching to Drizzle ORM for robust hybrid query support.
4. **Client Compatibility (Medium)**: Addressed by the Phase 0 Exit Gate demanding real-client handoff testing.

## 5. Test Strategy

- **Unit/Integration (Vitest)**: Core logic, Drizzle queries, redaction regex, token counting.
- **Eval Harness**: Dedicated dataset of real transcripts + adversarial injections to constantly verify precision/recall and security.
- **E2E (Playwright)**: Web App browser automation.
- **Real-Client Integration**: Live manual/scripted tests wrapping Claude Code and Codex processes to verify MCP interoperability and handoff continuity.
