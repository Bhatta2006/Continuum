# Architecture and Implementation Decisions

This document tracks assumptions and deviations made while executing the PRD. If an assumption is wrong or conflicts with product direction, we address it here.

## Assumptions Made During Planning (Step 1)

1. **Monorepo Tech Stack**: 
   - **Decision**: We chose a TypeScript/Node.js stack for both the Web App (Next.js) and the MCP Server/Backend (Fastify) instead of Python. 
   - **Rationale**: The official Model Context Protocol (MCP) TypeScript SDK is highly mature. Using a single language allows seamless sharing of domain models (Zod schemas, Prisma DB types) between the Web App, CLI, and Backend Server. A unified stack is faster for a small team to iterate on MVP.
   
2. **Database Choice**: 
   - **Decision**: PostgreSQL with `pgvector`.
   - **Rationale**: We need relational mapping (edges for supersession, attribution to actors/workspaces) and vector embeddings (for semantic search retrieval). PostgreSQL handles both effectively, removing the need for a separate vector DB service early on.

3. **Extraction LLM Independence**:
   - **Decision**: We assume we will build LLM extraction pipelines using standardized prompts/API wrappers (like the official AI SDKs) that allow plugging in any provider (OpenAI/Anthropic). 
   - **Rationale**: Keeps us model-agnostic and avoids hard vendor lock-in internally.

4. **Web App MVP Scope**:
   - **Decision**: The Next.js web app is strictly for configuration, approval inboxes, and browsing memory (read/management). The primary *write* interaction happens inside the user's IDE/Agent via MCP.
   - **Rationale**: Keeps us focused on the "invisible when working" UX principle.

5. **Local Database during Dev**:
   - **Decision**: We assume local development will use Docker (testcontainers or local docker-compose) for running PostgreSQL.
   - **Rationale**: Easy reproduction of the `pgvector` environment.

*Add new decisions here as they are made during milestone execution.*
