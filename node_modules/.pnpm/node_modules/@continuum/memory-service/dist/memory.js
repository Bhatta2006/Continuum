"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@continuum/db");
const security_1 = require("@continuum/security");
class MemoryService {
    db;
    embedder;
    deduplicator;
    conflictDetector;
    constructor(db, embedder, deduplicator, conflictDetector) {
        this.db = db;
        this.embedder = embedder;
        this.deduplicator = deduplicator;
        this.conflictDetector = conflictDetector;
    }
    async proposeMemory(ctx, params) {
        security_1.PolicyEngine.assert(ctx, { action: 'propose', resourceType: 'memory_item', projectId: params.projectId });
        // Redaction
        const { redactedText } = (0, security_1.redact)(params.content);
        const { redactedText: redactedProvenance } = (0, security_1.redact)(params.provenance || '');
        // Deduplication
        const dedupeCfg = params.dedupeConfig || { similarityThreshold: 0.1 };
        const existingDuplicate = await this.deduplicator.findDuplicate(params.projectId, redactedText, dedupeCfg);
        if (existingDuplicate) {
            await this.deduplicator.mergeDuplicate(existingDuplicate.id, redactedProvenance);
            // Audit log
            await this.db.insert(db_1.auditLogs).values({
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
        const similarQuery = (0, drizzle_orm_1.sql) `
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
                const [inserted] = await this.db.insert(db_1.memoryItems).values({
                    projectId: params.projectId,
                    content: redactedText,
                    type: params.type,
                    scope: params.scope || 'project',
                    status: 'quarantined',
                    embedding,
                    provenance: redactedProvenance,
                    authorId: ctx.identityId
                }).returning({ id: db_1.memoryItems.id });
                await this.db.insert(db_1.auditLogs).values({
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
        const [inserted] = await this.db.insert(db_1.memoryItems).values({
            projectId: params.projectId,
            content: redactedText,
            type: params.type,
            scope: params.scope || 'project',
            status: 'active',
            embedding,
            provenance: redactedProvenance,
            authorId: ctx.identityId
        }).returning({ id: db_1.memoryItems.id });
        await this.db.insert(db_1.auditLogs).values({
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
    async supersede(ctx, params) {
        security_1.PolicyEngine.assert(ctx, { action: 'write', resourceType: 'memory_item' });
        // Mark target as superseded
        await this.db.update(db_1.memoryItems)
            .set({ status: 'superseded' })
            .where((0, drizzle_orm_1.sql) `id = ${params.targetId}`);
        // Create edge
        await this.db.insert(db_1.memoryEdges).values({
            sourceId: params.sourceId,
            targetId: params.targetId,
            type: 'supersedes'
        });
        await this.db.insert(db_1.auditLogs).values({
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
exports.MemoryService = MemoryService;
