import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { identities, toolAccounts, auditLogs } from '@continuum/db';
import { redact } from '../src/redaction';

describe('Audit & Redaction Integration', () => {
  let db: ReturnType<typeof drizzle>;
  let pg: PGlite;
  let actorId: string;

  beforeAll(async () => {
    pg = new PGlite();
    db = drizzle(pg);
    
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

    const insertedIdentity = await db.insert(identities).values({
      name: 'Agent Smith'
    }).returning();
    actorId = insertedIdentity[0].id;
  });

  it('should redact secrets before writing to audit log details', async () => {
    const rawInput = 'User attempted to access with token Bearer abcdef12345.eyJh.bGc and AWS key AKIAIOSFODNN7EXAMPLE';
    const { redactedText, stats } = redact(rawInput);
    
    // Attempt write
    const log = await db.insert(auditLogs).values({
      actorId,
      action: 'read',
      result: 'DENIED',
      details: redactedText // We use the redacted text
    }).returning();

    expect(log).toHaveLength(1);
    expect(log[0].details).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(log[0].details).not.toContain('abcdef12345.eyJh.bGc');
    expect(log[0].details).toContain('[REDACTED_AWS_KEY]');
    expect(log[0].details).toContain('[REDACTED_TOKEN]');
  });
});
