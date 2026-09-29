import { embedMany } from 'ai';

export interface EmbeddingProvider {
  getEmbeddings(texts: string[]): Promise<number[][]>;
  getEmbedding(text: string): Promise<number[]>;
}

export class VercelAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private model: any) {}

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    // Basic batch limits (e.g., chunk by 100)
    const BATCH_SIZE = 100;
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const { embeddings } = await embedMany({
        model: this.model,
        values: batch,
      });
      results.push(...embeddings);
    }
    return results;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const res = await this.getEmbeddings([text]);
    return res[0];
  }
}

// For testing purposes so we don't need real keys
export class MockEmbeddingProvider implements EmbeddingProvider {
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(t => this.mockEmbed(t));
  }
  async getEmbedding(text: string): Promise<number[]> {
    return this.mockEmbed(text);
  }
  private mockEmbed(text: string): number[] {
    // Generate deterministic 1536-dimensional mock vector based on string length and char codes
    const vec = new Array(1536).fill(0);
    for(let i=0; i<text.length; i++) {
      vec[i % 1536] += text.charCodeAt(i) / 255;
    }
    // Normalize
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map(v => mag > 0 ? v / mag : 0);
  }
}
