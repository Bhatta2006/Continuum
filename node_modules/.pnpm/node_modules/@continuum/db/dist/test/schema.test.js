"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pglite_1 = require("@electric-sql/pglite");
const pglite_2 = require("drizzle-orm/pglite");
const schema_1 = require("../src/schema");
(0, vitest_1.describe)('Database Schema & Identity', () => {
    let db;
    let pg;
    (0, vitest_1.beforeAll)(async () => {
        pg = new pglite_1.PGlite();
        db = (0, pglite_2.drizzle)(pg);
        // We mock the table creation for this test environment since drizzle-kit push isn't run
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
    `);
    });
    (0, vitest_1.it)('should create an identity and link a tool account', async () => {
        const insertedIdentity = await db.insert(schema_1.identities).values({
            name: 'Agent Smith'
        }).returning();
        (0, vitest_1.expect)(insertedIdentity).toHaveLength(1);
        (0, vitest_1.expect)(insertedIdentity[0].name).toBe('Agent Smith');
        const insertedAccount = await db.insert(schema_1.toolAccounts).values({
            identityId: insertedIdentity[0].id,
            provider: 'claude_code',
            accountId: 'acct_12345'
        }).returning();
        (0, vitest_1.expect)(insertedAccount).toHaveLength(1);
        (0, vitest_1.expect)(insertedAccount[0].identityId).toBe(insertedIdentity[0].id);
    });
});
