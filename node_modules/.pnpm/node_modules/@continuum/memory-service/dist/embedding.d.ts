export interface EmbeddingProvider {
    getEmbeddings(texts: string[]): Promise<number[][]>;
    getEmbedding(text: string): Promise<number[]>;
}
export declare class VercelAIEmbeddingProvider implements EmbeddingProvider {
    private model;
    constructor(model: any);
    getEmbeddings(texts: string[]): Promise<number[][]>;
    getEmbedding(text: string): Promise<number[]>;
}
export declare class MockEmbeddingProvider implements EmbeddingProvider {
    getEmbeddings(texts: string[]): Promise<number[][]>;
    getEmbedding(text: string): Promise<number[]>;
    private mockEmbed;
}
