"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDeduplicator = void 0;
const drizzle_orm_1 = require("drizzle-orm");
class MemoryDeduplicator {
    db;
    embedder;
    constructor(db, embedder) {
        this.db = db;
        this.embedder = embedder;
    }
    // Basic heuristic to avoid merging opposite facts that embeddings might think are close
    hasOppositeMeaningHeuristic(a, b) {
        const negations = ['not', 'never', "don't", 'cannot', "can't", 'no'];
        const aWords = new Set(a.toLowerCase().split(/\W+/));
        const bWords = new Set(b.toLowerCase().split(/\W+/));
        let aHasNeg = negations.some(n => aWords.has(n));
        let bHasNeg = negations.some(n => bWords.has(n));
        return aHasNeg !== bHasNeg;
    }
    async findDuplicate(projectId, content, config) {
        const embedding = await this.embedder.getEmbedding(content);
        // Check exact text match first
        const exactMatches = await this.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, content, provenance FROM memory_items 
      WHERE project_id = ${projectId} AND status = 'active' AND content = ${content}
      LIMIT 1
    `);
        if (exactMatches.rows && exactMatches.rows.length > 0) {
            return exactMatches.rows[0];
        }
        if (exactMatches.length > 0) { // some drivers return rows directly
            return exactMatches[0];
        }
        if (config.requireExactMatch)
            return null;
        // Check semantic match
        const querySQL = (0, drizzle_orm_1.sql) `
      SELECT id, content, provenance, (embedding <=> ${JSON.stringify(embedding)}::vector) as distance
      FROM memory_items
      WHERE project_id = ${projectId} AND status = 'active'
        AND (embedding <=> ${JSON.stringify(embedding)}::vector) < ${config.similarityThreshold}
      ORDER BY distance ASC
      LIMIT 10
    `;
        const semanticMatches = await this.db.execute(querySQL);
        const rows = semanticMatches.rows || semanticMatches;
        for (const row of rows) {
            if (!this.hasOppositeMeaningHeuristic(content, row.content)) {
                return row;
            }
        }
        return null;
    }
    // Merges a new finding into an existing memory item, updating its provenance
    async mergeDuplicate(existingId, newProvenance) {
        if (!newProvenance)
            return;
        // Fetch existing provenance
        const existing = await this.db.execute((0, drizzle_orm_1.sql) `SELECT provenance FROM memory_items WHERE id = ${existingId}`);
        const rows = existing.rows || existing;
        if (rows.length === 0)
            return;
        const currentProv = rows[0].provenance || '';
        if (currentProv.includes(newProvenance))
            return; // already there
        const combinedProv = currentProv ? `${currentProv}, ${newProvenance}` : newProvenance;
        await this.db.execute((0, drizzle_orm_1.sql) `
      UPDATE memory_items 
      SET provenance = ${combinedProv}, last_seen_at = NOW()
      WHERE id = ${existingId}
    `);
    }
}
exports.MemoryDeduplicator = MemoryDeduplicator;
