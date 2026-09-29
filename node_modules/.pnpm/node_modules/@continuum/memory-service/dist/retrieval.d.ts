import { EmbeddingProvider } from './embedding';
import { SecurityContext } from '@continuum/security';
export interface RetrievalParams {
    query: string;
    projectId: string;
    scope?: 'private' | 'project' | 'team' | 'org';
    status?: 'active' | 'superseded' | 'quarantined' | 'rejected';
    limit?: number;
}
export declare class MemoryRetrieval {
    private db;
    private embedder;
    constructor(db: any, embedder: EmbeddingProvider);
    search(ctx: SecurityContext, params: RetrievalParams): Promise<any>;
}
