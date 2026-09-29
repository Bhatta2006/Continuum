"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEmbeddingProvider = exports.VercelAIEmbeddingProvider = void 0;
const ai_1 = require("ai");
class VercelAIEmbeddingProvider {
    model;
    constructor(model) {
        this.model = model;
    }
    async getEmbeddings(texts) {
        if (texts.length === 0)
            return [];
        // Basic batch limits (e.g., chunk by 100)
        const BATCH_SIZE = 100;
        const results = [];
        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
            const batch = texts.slice(i, i + BATCH_SIZE);
            const { embeddings } = await (0, ai_1.embedMany)({
                model: this.model,
                values: batch,
            });
            results.push(...embeddings);
        }
        return results;
    }
    async getEmbedding(text) {
        const res = await this.getEmbeddings([text]);
        return res[0];
    }
}
exports.VercelAIEmbeddingProvider = VercelAIEmbeddingProvider;
// For testing purposes so we don't need real keys
class MockEmbeddingProvider {
    async getEmbeddings(texts) {
        return texts.map(t => this.mockEmbed(t));
    }
    async getEmbedding(text) {
        return this.mockEmbed(text);
    }
    mockEmbed(text) {
        // Generate deterministic 1536-dimensional mock vector based on string length and char codes
        const vec = new Array(1536).fill(0);
        for (let i = 0; i < text.length; i++) {
            vec[i % 1536] += text.charCodeAt(i) / 255;
        }
        // Normalize
        const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
        return vec.map(v => mag > 0 ? v / mag : 0);
    }
}
exports.MockEmbeddingProvider = MockEmbeddingProvider;
