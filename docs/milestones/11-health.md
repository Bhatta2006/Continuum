# Milestone 11: Health Dashboard & Eval Harness (P1)

## Goal
Build a dashboard view for tracking the health of the project's memory (e.g., stale count, coverage). Also, document and build the foundational Eval Harness (`docs/evals.md`) for testing retrieval and extraction quality at scale.

## Deliverables
- `docs/evals.md`: Details the strategy for our Evaluation Harness (Precision/Recall testing for Extraction, NDCG/HitRate for Retrieval).
- `app/projects/[projectId]/health/page.tsx`: A dashboard UI displaying memory health metrics such as Total Memories, Pending Proposals, Conflicts, and Stale Memories.
- Playwright E2E test verifying the Health Dashboard rendering.

## Test Criteria
- Eval harness docs are complete.
- Dashboard renders correctly with mock metrics.
- Playwright test passes.
