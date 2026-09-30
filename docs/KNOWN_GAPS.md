# Known Gaps and Stubs

This document tracks any features, core logic, or integrations that have been intentionally stubbed, mocked, or skipped during milestone execution to maintain velocity. 

*Per Ground Rule 4: "No placeholder code, no mocked-out core logic presented as finished, no silent TODOs. If something is stubbed, mark it clearly here."*

## Current Gaps

### M3: Memory Core
- Still pending full benchmark and eval reporting for: recall@k, precision@k, negation-pair dedupe results, and the 10K/100K item scaling benchmark.

### M5: MCP Server Base
- Deferring `memory.record_decision`, `memory.flag_stale` and `source.open` tools from the MCP server to a later milestone to prioritize `memory.search`, `memory.propose`, and `memory.get_brief` (stub).
