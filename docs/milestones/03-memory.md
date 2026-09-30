# Milestone 3: Memory Core, Retrieval & Conflict Detection

## Objective
Implement a correct, permission-safe memory engine with high-quality retrieval and a real lifecycle.

## Deliverables
- **Schema Updates**: Added `memoryEdges` (for the supersession graph) and updated `memoryItems` with new fields (`status`, `confidence`, `provenance`, `last_seen_at`) in `@continuum/db`. 
- **@continuum/memory-service**:
  - `memory.ts`: Implemented `MemoryService` that handles `proposeMemory` and `supersede`. All actions are routed through the `PolicyEngine` (M2) and append an audit log (M2). The service automatically intercepts and checks for conflicts and duplication.
  - `dedupe.ts`: Implemented `MemoryDeduplicator` utilizing semantic deduplication with `pgvector` distance checks, plus a fast-pass exact match check. Added `hasOppositeMeaningHeuristic` which explicitly handles negations so diametrically opposed facts (e.g. "Use Postgres" vs "Do not use Postgres") are NOT merged even if their embeddings are close.
  - `retrieval.ts`: Implemented `MemoryRetrieval` which executes hybrid search queries (`ts_rank` + `pgvector` distance). It filters memory results strictly by `projectId`, `scope`, and `status`.
  - `conflict.ts`: Implemented `ConflictDetector` abstraction with a naive implementation that flags conflicting facts (like exact negations) and quarantines them on insertion. An `LLMConflictDetector` is also stubbed with `@ai-sdk/core` waiting for real keys in M4.
  - `embedding.ts`: Added abstract interfaces (`EmbeddingProvider`) with a mocked generator and an Vercel AI SDK integration.

## Tests & Verification
- Comprehensive unit tests created in `packages/memory-service/test/memory.test.ts`.
- **Dedupe threshold tuning**: Tests verify that semantic deduplication successfully rejects negations/opposite-meaning tests while successfully merging similar phrases without negations.
- **Conflict detection (L-2)**: Tests confirm that conflicting insertions are caught, stored as quarantined, and tracked in audit logs.
- **Retrieval filtering**: SQL queries are verified to accurately apply status, scope, and project constraints *before* limiting the subset.
- The `pnpm --recursive run test` command ensures 29 tests total are passing gracefully.

## Next Steps
Milestone 4: Extraction spike. We will set up true `ai` generation and measure extraction precision/recall against real sample transcripts.
