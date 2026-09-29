import { sql } from 'drizzle-orm';
import { memoryItems, memoryEdges, auditLogs } from '@continuum/db';
import { redact, PolicyEngine, SecurityContext } from '@continuum/security';
import { MemoryDeduplicator, DedupeConfig } from './dedupe';
import { ConflictDetector } from './conflict';
import { EmbeddingProvider } from './embedding';

export class MemoryService {
  constructor(
    private db: any,
    private embedder: EmbeddingProvider,
    private deduplicator: MemoryDeduplicator,
    private conflictDetector: ConflictDetector
  ) {}

  async proposeMemory(
    ctx: SecurityContext, 
    params: { projectId: string; content: string; type: any; provenance?: string; scope?: any; dedupeConfig?: DedupeConfig }
  ) {
    PolicyEngine.assert(ctx, { action: 'propose', resourceType: 'memory_item', projectId: params.projectId });

    // Redaction
    const { redactedText } = redact(params.content);
    const { redactedText: redactedProvenance } = redact(params.provenance || '');

    // Deduplication
    const dedupeCfg = params.dedupeConfig || { similarityThreshold: 0.1 };
    const existingDuplicate = await this.deduplicator.findDuplicate(params.projectId, redactedText, dedupeCfg);
    
    if (existingDuplicate) {
      await this.deduplicator.mergeDuplicate(existingDuplicate.id, redactedProvenance);
      // Audit log
      await this.db.insert(auditLogs).values({
        actorId: ctx.identityId,
        toolAccountId: ctx.toolAccountId,
        workspaceId: ctx.workspaceId,
        projectId: params.projectId,
        action: 'merge',
        targetId: existingDuplicate.id,
        result: 'SUCCESS',
        details: 'Merged into existing duplicate'
      });
      return { action: 'merged', id: existingDuplicate.id };
    }

    // Conflict detection (against active memory)
    // For performance, we only check against semantically close active memories
    const embedding = await this.embedder.getEmbedding(redactedText);
    const similarQuery = sql`
      SELECT id, content FROM memory_items
      WHERE project_id = ${params.projectId} AND status = 'active'
        AND (embedding <=> ${JSON.stringify(embedding)}::vector) < 0.2
      LIMIT 5
    `;
    const similarItems = await this.db.execute(similarQuery);
    const rows = similarItems.rows || similarItems;
    
    for (const row of rows) {
      const conflictRes = await this.conflictDetector.checkConflict(redactedText, row.content);
      if (conflictRes.isConflict) {
        // We found a conflict. Create the memory item but mark it as quarantined
        const [inserted] = await this.db.insert(memoryItems).values({
          projectId: params.projectId,
          content: redactedText,
          type: params.type,
          scope: params.scope || 'project',
          status: 'quarantined',
          embedding,
          provenance: redactedProvenance,
          authorId: ctx.identityId
        }).returning({ id: memoryItems.id });

        await this.db.insert(auditLogs).values({
          actorId: ctx.identityId,
          toolAccountId: ctx.toolAccountId,
          workspaceId: ctx.workspaceId,
          projectId: params.projectId,
          action: 'propose',
          targetId: inserted.id,
          result: 'QUARANTINED',
          details: `Conflict with ${row.id}: ${conflictRes.reason}`
        });

        return { action: 'quarantined', id: inserted.id, conflictWith: row.id, reason: conflictRes.reason };
      }
    }

    // Normal insertion
    const [inserted] = await this.db.insert(memoryItems).values({
      projectId: params.projectId,
      content: redactedText,
      type: params.type,
      scope: params.scope || 'project',
      status: 'active',
      embedding,
      provenance: redactedProvenance,
      authorId: ctx.identityId
    }).returning({ id: memoryItems.id });

    await this.db.insert(auditLogs).values({
      actorId: ctx.identityId,
      toolAccountId: ctx.toolAccountId,
      workspaceId: ctx.workspaceId,
      projectId: params.projectId,
      action: 'propose',
      targetId: inserted.id,
      result: 'SUCCESS',
      details: 'Created new memory item'
    });

    return { action: 'created', id: inserted.id };
  }

  async supersede(ctx: SecurityContext, params: { sourceId: string; targetId: string; reason?: string }) {
    PolicyEngine.assert(ctx, { action: 'write', resourceType: 'memory_item' });

    // Mark target as superseded
    await this.db.update(memoryItems)
      .set({ status: 'superseded' })
      .where(sql`id = ${params.targetId}`);
    
    // Create edge
    await this.db.insert(memoryEdges).values({
      sourceId: params.sourceId,
      targetId: params.targetId,
      type: 'supersedes'
    });

    await this.db.insert(auditLogs).values({
      actorId: ctx.identityId,
      toolAccountId: ctx.toolAccountId,
      workspaceId: ctx.workspaceId,
      action: 'supersede',
      targetId: params.targetId,
      result: 'SUCCESS',
      details: `Superseded by ${params.sourceId}: ${params.reason || ''}`
    });

    return { success: true };
  }
}
