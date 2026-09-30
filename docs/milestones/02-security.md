# Milestone 2: Security, Governance & Audit

## Goal
Secure every write path from the start. Implement secret/PII redaction, append-only audit logging, and agent permission checks.

## Changes Made
1. **Append-Only Audit Log**: Added `audit_logs` table to `packages/db/src/schema.ts` holding actor ID, tool account, workspace, project, scope, action, target, result, and stringified (redacted) details.
2. **Redaction Pipeline**: Created `@continuum/security/src/redaction.ts`. Detects AWS keys, API keys, generic tokens, Private keys, DB connection strings, emails, SSNs, and E.164 phone numbers. Recursively decodes URL-encoded and Base64 sequences to prevent bypass via encoding, re-encoding if a secret was redacted.
3. **Policy Engine**: Created `@continuum/security/src/policy.ts`. Implements RBAC and central Agent permissions (read-only, propose-only, write). Enforces that no application process can mutate or delete from the `audit_logs` table directly, and that no agent can permanently delete memory.
4. **Integration Test**: Wrote an integration test bridging `schema.ts`, local PGLite db, and the redaction engine to prove that any write to the DB gets successfully redacted and audit trails are properly constrained.

## Verification
`pnpm --recursive run test` shows 20 passing tests across both packages:

```text
packages/db test$ vitest run
packages/db test:  RUN  v2.1.9 D:/Continuum/packages/db
packages/db test:  ✓ test/schema.test.ts (1 test) 873ms
packages/db test:  Test Files  1 passed (1)

packages/security test$ vitest run
packages/security test:  RUN  v2.1.9 D:/Continuum/packages/security
packages/security test:  ✓ test/policy.test.ts (7 tests) 3ms
packages/security test:  ✓ test/redaction.test.ts (12 tests) 6ms
packages/security test:  ✓ test/integration.test.ts (1 test) 1378ms
packages/security test:  Test Files  3 passed (3)
packages/security test:       Tests  20 passed (20)
```

**Adversarial Coverage**:
- URL-encoded strings where partial parts are `%`-encoded.
- Base64 encoded secrets.
- ReDoS checked by generating a 100k length string against the regex patterns (runs in <100ms).
- Connection string boundary tests and phone number bounding.

## Deviations / Decisions
- Prompt-injection quarantine was deferred to M4 to align with `BUILD_PLAN.md` scope definitions.
- Kept `@continuum/db` and `@continuum/security` isolated and independent without circular dependencies. Security tests using DB live inside `packages/security/test/integration.test.ts`.

## Next Step
Ready for **Milestone 3: Memory Core, Retrieval & Conflict Detection**.
