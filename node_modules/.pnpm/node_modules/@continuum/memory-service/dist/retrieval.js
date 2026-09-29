"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryRetrieval = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const security_1 = require("@continuum/security");
class MemoryRetrieval {
    db;
    embedder;
    constructor(db, embedder) {
        this.db = db;
        this.embedder = embedder;
    }
    async search(ctx, params) {
        // Policy Check: Can the user read memories in this project/workspace?
        security_1.PolicyEngine.assert(ctx, { action: 'read', resourceType: 'memory_item', projectId: params.projectId });
        // Also verify the context workspace matches the intended workspace context
        // In a real app we'd verify projectId belongs to ctx.workspaceId, we assume that's true for now.
        const targetEmbedding = await this.embedder.getEmbedding(params.query);
        const limit = params.limit || 10;
        const statusFilter = params.status || 'active';
        // We construct the Drizzle query using sql`` fragments for the pgvector and full-text parts
        const querySQL = (0, drizzle_orm_1.sql) `
      SELECT 
        m.id, 
        m.content, 
        m.type,
        m.status,
        m.provenance,
        m.confidence,
        m.last_seen_at,
        (m.embedding <=> ${JSON.stringify(targetEmbedding)}::vector) as vector_distance,
        ts_rank(m.search_vector, plainto_tsquery('english', ${params.query})) as text_rank
      FROM memory_items m
      WHERE m.project_id = ${params.projectId}
        AND m.status = ${statusFilter}
        ${params.scope ? (0, drizzle_orm_1.sql) `AND m.scope = ${params.scope}` : (0, drizzle_orm_1.sql) ``}
        AND (
          (m.embedding <=> ${JSON.stringify(targetEmbedding)}::vector) < 0.5 OR
          m.search_vector @@ plainto_tsquery('english', ${params.query})
        )
      ORDER BY 
        -- simple hybrid rank formula: lower distance is better, higher text_rank is better
        -- so we want lower (vector_distance - text_rank) 
        ((m.embedding <=> ${JSON.stringify(targetEmbedding)}::vector) - ts_rank(m.search_vector, plainto_tsquery('english', ${params.query}))) ASC
      LIMIT ${limit}
    `;
        const res = await this.db.execute(querySQL);
        return res.rows || res; // depending on pg adapter
    }
}
exports.MemoryRetrieval = MemoryRetrieval;
