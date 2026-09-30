# Known Gaps and Stubs

This document tracks any features, core logic, or integrations that have been intentionally stubbed, mocked, or skipped during milestone execution to maintain velocity. 

*Per Ground Rule 4: "No placeholder code, no mocked-out core logic presented as finished, no silent TODOs. If something is stubbed, mark it clearly here."*

## Current Gaps

### M3: Memory Core
- **Benchmark Gaps**: The following benchmarks are deferred to M10:
  - **recall@k**: TBD
  - **precision@k**: TBD
  - **negation-pair dedupe**: TBD
  - **10K item scaling**: TBD
  - **100K item scaling**: TBD

### M5: MCP Server Base
- Deferring `memory.record_decision`, `memory.flag_stale` and `source.open` tools from the MCP server to a later milestone to prioritize `memory.search`, `memory.propose`, and `memory.get_brief` (stub).
