# Milestone 8: Token-Budgeted Context Assembly

## Goal
Build `context.assemble` using `tiktoken` to dynamically pack the Project Brief, retrieved memory items, and active Task Capsule into a strictly budgeted context window for LLMs.

## Deliverables
- `packages/context-assembly` package.
- Integration of `tiktoken` (or a similar tokenizer wrapper) to count tokens accurately.
- `assemble(budget: number, brief: string, memories: MemoryItem[], capsule?: TaskCapsule)` function that prioritizes the Brief and Task Capsule, then packs as many relevant Memory Items as possible without exceeding the `budget`.

## Test Criteria
- Output token count rigorously respects the specified limits.
- Core instructions (Brief/Capsule) are never truncated. Memory items are cleanly omitted or truncated if they overflow the budget.
