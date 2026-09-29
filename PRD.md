# PRD: Cross-Agent Context & Memory Platform

**Working name:** Continuum (placeholder)
**Status:** Draft v0.1
**Owner:** TBD
**Last updated:** 29 Sep 2026

> **One-line pitch:** The context layer for AI-assisted product building. Every agent, chatbot and IDE you use (Claude, ChatGPT, Gemini, Codex, Claude Code, Cursor and more) reads from and writes to one governed, always-current project brain. Switch tool, account, device or teammate, and nothing gets lost.

---

## 1. Background & Problem

Builders now use many AI tools in parallel: chatbots for ideation (ChatGPT, Claude, Gemini), coding agents for implementation (Claude Code, Codex, Cursor), often across multiple accounts and plans. Context is fragmented:

| # | Pain point | Example |
|---|-----------|---------|
| P1 | **Vendor-locked memory.** Each assistant's memory lives inside its own product and account. | A second Claude Pro or ChatGPT Pro account starts from zero. |
| P2 | **Tool switching loses state.** Decisions made in a chatbot never reach the coding agent, and vice versa. | Architecture debated in ChatGPT, then re-explained to Claude Code. |
| P3 | **Session and limit cliffs.** Rate limits, context-window exhaustion and account switches kill in-progress work. | Agent hits a limit mid-refactor, and the next agent doesn't know what was done. |
| P4 | **Manual memory doesn't scale.** Hand-written notes and pasted summaries go stale within days. | `CLAUDE.md` says one thing, the code does another. |
| P5 | **Stale or contradictory memory.** Existing memory stores accumulate outdated facts with no lifecycle. | Agent confidently follows a decision that was reversed last week. |
| P6 | **No team-level shared context.** Memory tools are mostly personal; teams with mixed toolchains have no shared brain. | Each engineer's agent knows a different slice of the project. |
| P7 | **Security and governance gaps.** Context includes secrets, customer data and IP flowing into many vendors. | No audit trail, no scoping, no redaction. |
| P8 | **No way to tell if memory helps.** Nobody measures whether injected memory improves or degrades agent output. | Bad memory silently hurts quality. |

## 2. Vision, Goals & Non-Goals

### 2.1 Vision
Make project context a **portable, vendor-neutral, continuously maintained asset** that outlives any single tool, model, account or session.

### 2.2 Goals
1. **Universal connectivity:** works with any AI tool, agent, IDE or script, via MCP, REST/SDK, CLI, browser extension, file sync and import.
2. **Zero-effort capture:** context is extracted automatically from sessions, repos, PRs, issues and docs. Manual note-taking is optional.
3. **Living memory:** facts have provenance, confidence, freshness and supersession. Stale or conflicting knowledge is detected and resolved.
4. **Seamless handoff:** any agent can resume another agent's in-flight task with full state, across tools and accounts.
5. **Team-native:** shared project memory with roles, scopes and permissions, not just a personal notepad.
6. **Enterprise-safe:** secret redaction, encryption, audit logs, data residency, self-host option.
7. **Measurable:** built-in evals show whether memory improves outcomes.

### 2.3 Non-Goals (v1)
- Not a chatbot or a coding agent. We integrate with them, not replace them.
- Not a general-purpose second brain or note-taking app (Notion, Obsidian territory).
- Not a model-training or fine-tuning platform.
- Not a full agent orchestration framework (we provide handoff state, not the runtime).

## 3. Target Users & Personas

| Persona | Description | Primary needs | Willingness to pay |
|---------|-------------|---------------|--------------------|
| **Solo Builder ("Maker")** | Indie hacker or founder using 3+ AI tools, possibly multiple accounts. | Free continuity across tools and accounts, low setup. | Low to medium ($10 to $30/mo) |
| **Small Eng Team Lead** | 3 to 30 engineers, mixed agent stack (Claude Code, Codex, Cursor). | Shared project brain, onboarding, consistent agent behavior. | **High** (per-seat, primary wedge) |
| **Platform / Security Lead** | Owns AI tooling policy at a mid or large company. | Governance, audit, redaction, SSO, residency. | **High** (enterprise) |
| **Agent Developer** | Builds agents and needs a memory/state backend. | Reliable API, low latency, evals. | Medium (usage-based) |
| **Vertical Professional** (v2+) | Legal, sales, research users with domain-structured context. | Domain schemas and integrations. | High |

**Primary beachhead:** Small Eng Team Lead and Solo Builder (Phase 1), expanding to Platform/Security Lead (Phase 2 to 3).

## 4. Product Principles

1. **Neutral by design.** No vendor lock-in for us or for users. Users can export everything at any time in open formats.
2. **Repo-first, memory-second.** Version-controlled files (`AGENTS.md` and similar) are a first-class output, not a competitor. We keep them auto-generated and current.
3. **Provenance over volume.** Every memory links to its source and shows confidence. Fewer, better, verified facts beat a giant vector dump.
4. **Read-path quality is the product.** The right 2K tokens at the right time beat 200K tokens of everything.
5. **Human-in-the-loop by default for high-impact changes.** Auto-capture proposes, and users approve, for decisions and conventions.
6. **Secure by default.** Secrets are never stored. Scopes are explicit.
7. **Works anywhere.** If it can read text or call HTTP, it can use us.

## 5. Core Concepts & Data Model

| Concept | Definition |
|---------|-----------|
| **Workspace** | Top-level container (person or team). |
| **Project** | A product or repo-set with its own context. Workspaces contain many projects. |
| **Memory Item** | Atomic unit of knowledge (fact, decision, convention, preference, constraint, task state, glossary term). |
| **Memory Type** | `decision`, `convention`, `architecture`, `constraint`, `preference`, `task_state`, `learning`, `glossary`, `open_question`, `risk`. |
| **Provenance** | Source pointer: session ID, tool, file and commit, PR, URL, timestamp, author (human or agent). |
| **Confidence & Freshness** | Score plus last-verified timestamp. Decays unless re-confirmed. |
| **Supersession Graph** | Edges linking items that replace, contradict or refine others. |
| **Project Brief** | Auto-maintained, compact, structured summary of the project's current state (the "front page" every agent reads first). |
| **Task Capsule** | Serialized in-flight work state for handoff: goal, plan, completed steps, remaining steps, files touched, blockers, commands run, test status. |
| **Scope** | Visibility boundary: `private`, `project`, `team`, `org`. |
| **Connection** | An integration instance (e.g., Claude Code on laptop A, ChatGPT account 2). |
| **Identity** | A human or agent actor. Multiple tool accounts map to one Identity. |

**Storage architecture (logical):**
- **Canonical store:** relational DB (items, provenance, permissions, supersession edges).
- **Retrieval index:** hybrid vector + keyword + graph index over items and source chunks.
- **Blob store:** raw session transcripts and artifacts (encrypted, retention-controlled).
- **Event log:** append-only log of all reads/writes for audit and replay.

## 6. Feature Requirements

Priority key: **P0** = MVP, **P1** = fast follow, **P2** = later.

### 6.1 Universal Connectivity ("works with anything, anywhere")

| ID | Requirement | Priority |
|----|-------------|----------|
| C-1 | **Remote MCP server** (streamable HTTP + OAuth) exposing memory tools/resources; works with Claude (web, desktop, Code), ChatGPT connectors, Codex, Cursor, Windsurf, VS Code, Gemini CLI and any MCP client. | P0 |
| C-2 | **Local MCP/stdio server** for offline or self-hosted setups. | P0 |
| C-3 | **CLI** (`ctx init | sync | pull | push | handoff | resume`) for terminal-based agents and scripts. | P0 |
| C-4 | **REST + gRPC API and SDKs** (TS, Python, Go). | P0 |
| C-5 | **Repo file sync:** generate and keep `AGENTS.md`, `CLAUDE.md`, `.cursorrules` and equivalents in sync from the Project Brief (PR-based or direct commit, configurable). | P0 |
| C-6 | **Browser extension** for chatbot web UIs (ChatGPT, Claude, Gemini): capture selected conversations, inject context into a new chat, one-click "continue elsewhere." | P1 |
| C-7 | **Session miners** for local session files (Claude Code, Codex CLI, Cursor logs where available). | P0 |
| C-8 | **Import adapters:** ChatGPT/Claude/Gemini data exports, memory-profile exports, Notion, Obsidian, Markdown folders, GitHub issues/PRs, Linear/Jira, Slack. | P1 |
| C-9 | **Universal "paste" fallback:** generate a compact context block (copy button/URL) for tools with no integration. | P0 |
| C-10 | **Webhooks and event stream** for custom automation. | P1 |
| C-11 | **Mobile app** (capture by voice, review proposals, read brief). | P2 |
| C-12 | **Multi-account identity mapping:** link N accounts per vendor to one Identity so context follows the human, not the login. | P0 |

**Acceptance:** A user can connect Claude Code, Codex and a ChatGPT account to one project in under 10 minutes, and a fact stored via one is retrievable from the others within 5 seconds.

### 6.2 Automatic Capture & Extraction (Wedge #2)

| ID | Requirement | Priority |
|----|-------------|----------|
| E-1 | Extract candidate memory items from agent sessions, chat transcripts, commits, PR descriptions and comments, issues, docs and code changes. | P0 |
| E-2 | Classify by memory type; attach provenance and confidence. | P0 |
| E-3 | **Deduplicate and merge** against existing items (semantic + structural). | P0 |
| E-4 | **Proposal inbox:** high-impact items (decisions, constraints, conventions) go to a review queue with accept/edit/reject and bulk actions. Low-impact items auto-accept per policy. | P0 |
| E-5 | **Code-aware extraction:** tie items to files, modules and symbols; detect when code changes invalidate a stored fact. | P1 |
| E-6 | **"Why" capture:** prioritize rationale and rejected alternatives, not just outcomes. | P1 |
| E-7 | Configurable capture policies per project (what's captured, what's ignored, what needs approval). | P1 |
| E-8 | Continuous background re-summarization of the Project Brief. | P0 |

### 6.3 Living Memory: Freshness, Conflict & Lifecycle (Wedge #2, #5)

| ID | Requirement | Priority |
|----|-------------|----------|
| L-1 | **Supersession tracking:** when a new item contradicts an old one, link them, mark the old as superseded, and keep history. | P0 |
| L-2 | **Conflict detection** with surfaced resolution prompts ("Two decisions disagree: X vs Y"). | P0 |
| L-3 | **Staleness detection:** verify memory against current repo/docs. Flag or auto-demote items whose referenced code/files changed or vanished. | P1 |
| L-4 | **Confidence decay and re-verification** flows. | P1 |
| L-5 | **Time-travel:** view project memory as of any date. | P2 |
| L-6 | Memory garbage collection with user-visible audit of what was pruned and why. | P1 |

### 6.4 Retrieval & Context Assembly (the read path)

| ID | Requirement | Priority |
|----|-------------|----------|
| R-1 | **Task-aware context assembly:** given a task description and tool, return a token-budgeted context pack (Brief + relevant items + relevant task capsules). | P0 |
| R-2 | Hybrid retrieval: vector, keyword and graph traversal, with re-ranking. | P0 |
| R-3 | **Token budget control** per call (e.g., 1K/4K/16K) with graceful compression. | P0 |
| R-4 | **Tool-specific formatting** (Claude-style, OpenAI-style, plain text, JSON). | P1 |
| R-5 | Always include provenance handles so agents can request "show source." | P0 |
| R-6 | Scope- and permission-aware retrieval (never leaks across scopes). | P0 |
| R-7 | Session-start "hydration" hooks for tools that support them (e.g., Claude Code hooks, Codex config). | P1 |

### 6.5 Agent Handoff & Session Continuity (Wedge #3)

| ID | Requirement | Priority |
|----|-------------|----------|
| H-1 | **Task Capsule creation:** agents (or hooks) checkpoint goal, plan, progress, files touched, commands run, test state and blockers. | P0 |
| H-2 | **Resume:** `ctx resume` or an MCP tool loads the latest capsule into any other agent, on another tool or account. | P0 |
| H-3 | **Auto-checkpoint** on triggers: context nearing limit, rate-limit error, session end, idle timeout. | P1 |
| H-4 | **Git-aware handoff:** capsule references branch, commit SHA, uncommitted diff summary. Optionally stashes a WIP snapshot. | P1 |
| H-5 | **Handoff log:** who (which agent/account) did what, in order, for a task. | P1 |
| H-6 | **Cross-tool "continue in…" button** for chatbot to coding agent (e.g., ideation in ChatGPT becomes an implementation plan capsule for Claude Code). | P1 |
| H-7 | Parallel-agent awareness: detect two agents working on overlapping files/tasks and warn. | P2 |

**Acceptance:** Kill an agent mid-task; a different tool on a different account can resume and correctly state what's done, what's left and where to start, in under 30 seconds and with fewer than 3 clarifying questions.

### 6.6 Team Context (Wedge #1)

| ID | Requirement | Priority |
|----|-------------|----------|
| T-1 | Shared project memory with roles: Owner, Admin, Editor, Viewer, Agent. | P0 |
| T-2 | Scopes (`private` / `project` / `team` / `org`) with per-item overrides. | P0 |
| T-3 | **Onboarding brief:** generate a "get me up to speed" doc for new humans or agents, with links to sources. | P1 |
| T-4 | **Attribution:** every item shows the human and agent behind it. | P0 |
| T-5 | Team review workflows (approve decisions, assign owners to open questions). | P1 |
| T-6 | Activity feed and digest ("what changed in project memory this week"). | P1 |
| T-7 | Integrations: GitHub/GitLab, Linear/Jira, Slack/Teams, Notion. | P1 |
| T-8 | Cross-project linking (shared libraries, shared conventions). | P2 |

### 6.7 Governance, Security & Compliance (Wedge #4)

| ID | Requirement | Priority |
|----|-------------|----------|
| G-1 | **Secret and PII detection and redaction** before storage (API keys, tokens, credentials, configurable PII patterns). | P0 |
| G-2 | Encryption in transit and at rest; per-workspace keys (BYOK in enterprise tier). | P0 |
| G-3 | **Audit log** of every read/write, including which agent and what was retrieved. Exportable. | P0 |
| G-4 | Fine-grained permissions on tools/connections (e.g., "this agent may read but not write decisions"). | P0 |
| G-5 | Retention policies and right-to-delete (per item, per source, per workspace). | P0 |
| G-6 | SSO/SAML, SCIM. | P1 |
| G-7 | Data residency options; **self-hosted / VPC deployment.** | P1 |
| G-8 | Prompt-injection defenses on the memory write path (quarantine content that looks like instructions from untrusted sources; label untrusted provenance so agents can weigh it). | P0 |
| G-9 | Policy engine: block capture from certain repos/paths/channels; mandatory approval rules. | P1 |
| G-10 | SOC 2 Type II readiness plan (target within 12 months of GA). | P1 |

### 6.8 Evals & Memory Quality (Wedge #5)

| ID | Requirement | Priority |
|----|-------------|----------|
| V-1 | **Memory health dashboard:** stale count, conflict count, coverage, capture acceptance rate. | P1 |
| V-2 | **Retrieval eval harness:** define test questions and expected facts, then measure recall/precision of context packs. | P1 |
| V-3 | **A/B mode:** run the same agent task with and without memory (or with different memory configs) and compare outcomes. | P2 |
| V-4 | **Usage attribution:** which memory items were injected and later referenced or used by the agent. | P2 |
| V-5 | Public benchmark for cross-agent memory continuity (marketing + credibility). | P2 |

### 6.9 Vertical Packs (Wedge #6, later)

| ID | Requirement | Priority |
|----|-------------|----------|
| X-1 | Pluggable **schema packs** (memory types, extraction prompts, integrations) for domains such as legal, sales, research. | P2 |
| X-2 | First vertical chosen after 2 to 3 design-partner conversations in Phase 3. | P2 |

## 7. User Experience

### 7.1 Key Surfaces
1. **Web app:** Project Brief, Memory Explorer (search/filter/graph), Proposal Inbox, Conflicts, Handoffs, Connections, Governance, Evals.
2. **CLI:** for developers, scriptable, minimal.
3. **MCP tools inside agents:** the primary daily touchpoint. Users mostly *don't* open our UI.
4. **Browser extension:** capture and inject for chatbot UIs.
5. **Repo files:** auto-maintained instruction files that need no runtime integration.

### 7.2 Key User Flows

**Flow A: First-time setup (Solo Builder), target under 10 min**
1. Sign up, create a Project, connect GitHub repo.
2. Run `ctx init` or click "Connect Claude Code" to add the MCP server via one command or OAuth.
3. Platform ingests repo docs and (optionally) local session history and produces an initial Project Brief.
4. User reviews and approves the brief. Repo files are generated.
5. Connect a second tool (Codex/ChatGPT). Ask it "what's this project and what's the current state?" It answers correctly.

**Flow B: Ideation to implementation**
1. In ChatGPT or Claude chat, user brainstorms a feature. The extension or MCP tool saves decisions.
2. Platform proposes decisions and a draft implementation plan to the inbox.
3. User approves. In Claude Code, the agent hydrates with the plan and starts work.

**Flow C: Limit hit and account switch**
1. Agent A nears context or rate limit; auto-checkpoint writes a Task Capsule.
2. User opens Agent B (different tool or account) and runs `ctx resume` (or the MCP tool loads the capsule).
3. Agent B summarizes state and continues from the next step.

**Flow D: Team onboarding**
1. New engineer connects their tools to the team workspace.
2. Requests the onboarding brief. Agents now follow team conventions from day one.

**Flow E: Conflict resolution**
1. Platform detects a new decision contradicting an older one.
2. Owner gets a prompt: keep new, keep old, or merge. History is preserved.

### 7.3 UX Principles
- **Invisible when working, obvious when needed:** minimal UI for the happy path; review only what matters.
- **Every claim is one click from its source.**
- **Never surprise the user with what gets remembered:** a transparent "what we stored and why" view.

## 8. Technical Requirements

### 8.1 Architecture Overview (logical)

```
[Claude / ChatGPT / Gemini / Codex / Cursor / CLI / Extension / Scripts]
                    |  MCP · REST · gRPC · Files
              [ Gateway: auth, rate limits, policy, audit ]
                    |
    ┌───────────────┼─────────────────┬──────────────────┐
[Capture &      [Memory Service:   [Retrieval &      [Handoff
 Extraction]     items, graph,      Context            Service:
 (workers)       lifecycle]         Assembly]          capsules]
    └───────────────┼─────────────────┴──────────────────┘
        [Relational DB · Vector/keyword index · Blob store · Event log]
                    |
        [Connectors: GitHub, Linear, Slack, Notion, exports]
```

### 8.2 MCP Surface (initial)

**Tools**
- `memory.search(query, project, types?, budget_tokens?)`
- `memory.get_brief(project, budget_tokens?)`
- `memory.propose(item)` (agent-suggested write, goes through policy/inbox)
- `memory.record_decision(title, rationale, alternatives, scope)`
- `memory.flag_stale(item_id, reason)`
- `handoff.checkpoint(task_id, state)`
- `handoff.resume(task_id | latest)`
- `handoff.list(project)`
- `context.assemble(task_description, budget_tokens, target_tool?)`
- `source.open(provenance_id)`

**Resources:** `project://{id}/brief`, `project://{id}/decisions`, `project://{id}/conventions`, `task://{id}/capsule`.

**Prompts:** `onboard_me`, `resume_work`, `review_proposals`.

### 8.3 Performance & Reliability Targets

| Metric | Target |
|--------|--------|
| p95 `memory.search` latency | < 400 ms |
| p95 `context.assemble` latency | < 1.5 s |
| Write-to-readable propagation | < 5 s |
| Availability (paid tiers) | 99.9% |
| Extraction lag (session end to proposals) | < 2 min |
| Data durability | 99.999999% (managed storage) |

### 8.4 Compatibility Strategy
- **Tier 1 (native MCP):** Claude (web/desktop/Code), Codex, Cursor, VS Code, Windsurf, Gemini CLI, ChatGPT connectors (subject to plan/platform availability).
- **Tier 2 (file-based):** any tool that reads `AGENTS.md`/rules files, kept in sync by us.
- **Tier 3 (paste/extension):** any chatbot UI via context block or browser extension.
- **Tier 4 (API):** custom agents and scripts via SDKs.
- Maintain a public **compatibility matrix** and automated integration tests against each client's current release, since client behavior and plan-level availability change often.

### 8.5 Key Technical Risks
- **Extraction quality** (precision of decisions and conventions) drives everything. Needs a labeled dataset and continuous eval.
- **Session-log access** varies by tool and may change or be unavailable. Rely on hooks, MCP tool calls and repo signals as well.
- **Prompt injection via memory:** poisoned memory can steer agents. Requires provenance trust levels and quarantine.
- **Client limitations:** some clients restrict connectors by plan, transport or write access.

## 9. Success Metrics

**North-star:** *Weekly Active Projects with ≥ 2 distinct agent tools reading or writing memory.*

| Category | Metric | Phase-1 target |
|----------|--------|----------------|
| Activation | % of new projects connecting ≥ 2 tools in first 7 days | ≥ 40% |
| Activation | Time to first successful cross-tool retrieval | < 10 min median |
| Engagement | Memory reads per active project per week | ≥ 50 |
| Quality | Proposal acceptance rate | ≥ 60% |
| Quality | Stale/contradictory item rate (of retrieved items) | < 5% |
| Continuity | Successful handoff resumes (user-confirmed) | ≥ 85% |
| Retention | W8 project retention | ≥ 35% |
| Team | Teams with ≥ 3 seats | growth target set at launch |
| Trust | Security incidents (secret leaks) | 0 |
| Business | Free to paid conversion | ≥ 4% |

## 10. Business Model

| Tier | Price (indicative) | Includes |
|------|--------------------|----------|
| **Free** | $0 | 1 project, 3 connections, capped items/retrievals, community support |
| **Pro** | ~$15 to $25/mo | Unlimited projects, all connectors, handoff, multi-account identity, higher limits |
| **Team** | ~$25 to $40/seat/mo | Shared workspaces, roles, review workflows, team digests, integrations |
| **Enterprise** | Custom | SSO/SCIM, audit export, BYOK, VPC/self-host, data residency, SLA, policy engine |
| **Usage add-ons** | Metered | API/agent-developer volume, extraction compute, eval runs |

**Open-core option:** open-source the local MCP server, CLI and file-sync engine for trust and distribution, with the hosted platform, team and governance features paid.

## 11. Go-To-Market

1. **Beachhead:** developers running multiple coding agents (Claude Code, Codex, Cursor). Distribute via MCP directories/marketplaces, GitHub, dev communities and content ("How I never re-explain my project to an AI").
2. **Wedge product:** the free CLI + repo-file sync + handoff. It's useful even without an account.
3. **Viral loop:** generated repo files include a small "context by Continuum" attribution (opt-out). Team invites bring in seats.
4. **Design partners:** 10 to 15 small engineering teams with mixed toolchains. Weekly feedback, case studies.
5. **Land-and-expand:** solo builder to team to security-led company rollout.
6. **Credibility assets:** public continuity benchmark, transparent security posture, compatibility matrix.

## 12. Competitive Landscape (to verify before external use)

Categories and example players (verify current status and features):
- **Memory-as-a-service / agent memory:** Mem0, Zep, Supermemory, Letta and similar. Strong on API and developer memory. Opportunity: team workflows, handoff, governance, extraction quality, evals.
- **Cross-AI personal memory apps:** SecondBrain, Conxt, MemoryBase, MemPalace Cloud and similar. Strong on individual convenience. Opportunity: team, governance, lifecycle, code-awareness.
- **General knowledge tools via MCP:** Notion MCP and similar. Strong distribution. Opportunity: not agent-native, no lifecycle, handoff or code-aware staleness.
- **Native vendor memory:** Claude, ChatGPT, Gemini, Codex memories. Strong integration and default distribution. Structural gap: they don't share across vendors or accounts.
- **Repo instruction files (`AGENTS.md`, `CLAUDE.md`):** free, reliable, but manual and static. We automate and keep them fresh.

**Differentiation summary:** (1) neutrality across all vendors and accounts, (2) living memory with provenance and conflict handling, (3) handoff continuity, (4) team and governance depth, (5) measurable quality.

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Big labs ship strong native memory and cross-tool import | High | Stay vendor-neutral; win on team, governance, handoff and repo integration; be the "Switzerland" layer |
| Memory is commoditized (just text + MCP) | High | Compete on extraction quality, lifecycle, evals, and team workflow rather than storage |
| Extraction errors erode trust | High | Human-in-the-loop for high-impact items; provenance; eval-driven iteration |
| Security incident or secret leak | Critical | Redaction pre-storage, encryption, audit, pen-tests, minimal retention by default |
| Prompt injection through memory | High | Trust levels, quarantine, instruction-detection, agent-side provenance labels |
| Client/plan restrictions limit MCP access | Medium | Multi-tier compatibility (files, extension, paste, API) |
| Individual users won't pay | Medium | Focus monetization on teams and enterprise; keep solo free-to-cheap for distribution |
| ToS or terms concerns with capturing chatbot sessions | Medium | Prefer user-initiated capture, official exports and MCP writes; legal review before extension features |
| Scope creep ("build everything") | High | Strict phase gates (below); ship the wedge first |

## 14. Roadmap & Phasing

### Phase 0: Prototype (weeks 0 to 4)
- Remote + local MCP server with `search`, `get_brief`, `propose`, `checkpoint`, `resume`.
- CLI (`init`, `sync`, `handoff`, `resume`).
- Repo-file generator (`AGENTS.md`/`CLAUDE.md`).
- Session miner for Claude Code and Codex logs.
- Dogfood on own product. Recruit 10 design partners.
- **Exit:** cross-tool handoff works reliably for the founders daily.

### Phase 1: MVP / Private Beta (weeks 4 to 12)
- Web app: Brief, Memory Explorer, Proposal Inbox.
- Extraction v1 + dedupe + supersession + conflicts.
- Multi-account identity mapping.
- Secret redaction, audit log, scopes, encryption.
- Team workspaces with basic roles.
- Context assembly with token budgets.
- **Exit:** ≥ 40% of beta projects connect 2+ tools; handoff success ≥ 80%; 3 teams willing to pay.

### Phase 2: Public Launch (months 3 to 6)
- Browser extension; ChatGPT/Claude/Gemini capture and inject.
- Import adapters (exports, Notion, GitHub, Linear, Slack).
- Staleness detection tied to code changes.
- Auto-checkpoint triggers; git-aware handoff.
- Team review workflows, onboarding briefs, digests.
- Memory health dashboard; retrieval eval harness.
- Pricing live; Pro + Team tiers.
- **Exit:** N paying teams (target set at launch), W8 retention ≥ 35%.

### Phase 3: Enterprise & Moat (months 6 to 12)
- SSO/SCIM, BYOK, data residency, VPC/self-host.
- Policy engine, compliance reporting, SOC 2 Type II process.
- A/B memory evals and usage attribution; public continuity benchmark.
- Parallel-agent conflict detection.
- First vertical pack based on design-partner pull.
- Mobile app.

## 15. Dependencies & Assumptions

- MCP remains the dominant interoperability standard and major clients keep supporting remote MCP servers (verify per client and plan).
- Tool vendors keep local session data or hooks accessible enough for capture.
- LLM providers for extraction and summarization remain available at workable cost. Architecture should be **model-agnostic** for our own internal LLM usage.
- Users are willing to grant repo and tool access given strong security posture.

## 16. Open Questions

1. Which wedge leads the marketing: **team context**, **handoff**, or **auto-captured living brief**? (Validate with design partners.)
2. Open-core vs fully closed: which drives faster adoption without harming monetization?
3. How much auto-write autonomy should agents have by default versus proposal-only?
4. What's the right unit of memory (atomic facts vs. structured documents vs. both)?
5. How do we legally and ethically handle capture from chatbot UIs under each vendor's terms?
6. Self-hosted first or cloud first for security-sensitive early adopters?
7. Do we build our own extraction models eventually, or stay on third-party LLMs?
8. Pricing metric: per seat, per project, per retrieval, or hybrid?

## 17. Validation Plan (before heavy build)

- 20+ interviews with multi-agent developers and small teams. Capture current workarounds, tool spend and pain severity.
- Weekend prototype (Phase 0 scope) used on a real product for 2+ weeks.
- Fake-door or waitlist test for the Team tier and handoff feature.
- Manually run the extraction on 5 partners' repos and session histories to estimate precision/recall before automating.
- Success gate to proceed: ≥ 8 of 20 interviewees would pay or switch, and handoff works reliably in dogfooding.

## 18. Appendix

### A. Sample Project Brief Structure (auto-generated)
```
# Project Brief: <name>  (last verified: <date>, confidence: high)
## What we're building
## Current state / milestone
## Architecture (with links to sources)
## Key decisions (with rationale + rejected alternatives)
## Conventions (code style, testing, naming, workflows)
## Constraints & non-negotiables
## Open questions / risks
## In-flight tasks (capsule links)
## Glossary
```

### B. Sample Task Capsule (schema sketch)
```json
{
  "task_id": "t_123",
  "goal": "Add OAuth login",
  "plan": ["schema", "endpoints", "UI", "tests"],
  "completed": ["schema", "endpoints"],
  "next_step": "UI: login form",
  "repo": {"branch": "feat/oauth", "commit": "abc123", "dirty_files": ["src/ui/Login.tsx"]},
  "blockers": ["Need redirect URI from PM"],
  "test_status": "12 pass / 1 fail (auth.spec.ts)",
  "decisions_refs": ["m_45", "m_51"],
  "last_agent": {"tool": "codex", "account": "acct_2"},
  "updated_at": "2026-09-29T10:00:00Z"
}
```

### C. Glossary
- **MCP:** Model Context Protocol, an open standard for connecting AI assistants to tools and data.
- **Task Capsule:** portable snapshot of in-flight work for handoff.
- **Supersession:** relationship where a newer memory replaces or corrects an older one.
- **Context pack:** token-budgeted bundle of memory returned for a specific task.
