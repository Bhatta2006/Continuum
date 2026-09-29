"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pglite_1 = require("@electric-sql/pglite");
const pglite_2 = require("drizzle-orm/pglite");
const schema_1 = require("../src/schema");
const security_1 = require("@continuum/security");
(0, vitest_1.describe)('Audit & Redaction Integration', () => {
    let db;
    let pg;
    let actorId;
    (0, vitest_1.beforeAll)(async () => {
        pg = new pglite_1.PGlite();
        db = (0, pglite_2.drizzle)(pg);
        await pg.exec(`
      CREATE TABLE identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE tool_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        account_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id UUID NOT NULL REFERENCES identities(id),
        tool_account_id UUID REFERENCES tool_accounts(id),
        workspace_id UUID,
        project_id UUID,
        scope TEXT,
        action TEXT NOT NULL,
        target_id TEXT,
        result TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
        const insertedIdentity = await db.insert(schema_1.identities).values({
            name: 'Agent Smith'
        }).returning();
        actorId = insertedIdentity[0].id;
    });
    (0, vitest_1.it)('should redact secrets before writing to audit log details', async () => {
        const rawInput = 'User attempted to access with token Bearer abcdef12345.eyJh.bGc and AWS key AKIAIOSFODNN7EXAMPLE';
        const { redactedText, stats } = (0, security_1.redact)(rawInput);
        // Attempt write
        const log = await db.insert(schema_1.auditLogs).values({
            actorId,
            action: 'read',
            result: 'DENIED',
            details: redactedText // We use the redacted text
        }).returning();
        (0, vitest_1.expect)(log).toHaveLength(1);
        (0, vitest_1.expect)(log[0].details).not.toContain('AKIAIOSFODNN7EXAMPLE');
        (0, vitest_1.expect)(log[0].details).not.toContain('abcdef12345.eyJh.bGc');
        (0, vitest_1.expect)(log[0].details).toContain('[REDACTED_AWS_KEY]');
        (0, vitest_1.expect)(log[0].details).toContain('[REDACTED_TOKEN]');
    });
});
