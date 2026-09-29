import { EmbeddingProvider } from './embedding';
export interface DedupeConfig {
    similarityThreshold: number;
    requireExactMatch?: boolean;
}
export declare class MemoryDeduplicator {
    private db;
    private embedder;
    constructor(db: any, embedder: EmbeddingProvider);
    private hasOppositeMeaningHeuristic;
    findDuplicate(projectId: string, content: string, config: DedupeConfig): Promise<any>;
    mergeDuplicate(existingId: string, newProvenance: string | undefined): Promise<void>;
}
