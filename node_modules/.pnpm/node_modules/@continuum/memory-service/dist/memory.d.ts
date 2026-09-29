import { SecurityContext } from '@continuum/security';
import { MemoryDeduplicator, DedupeConfig } from './dedupe';
import { ConflictDetector } from './conflict';
import { EmbeddingProvider } from './embedding';
export declare class MemoryService {
    private db;
    private embedder;
    private deduplicator;
    private conflictDetector;
    constructor(db: any, embedder: EmbeddingProvider, deduplicator: MemoryDeduplicator, conflictDetector: ConflictDetector);
    proposeMemory(ctx: SecurityContext, params: {
        projectId: string;
        content: string;
        type: any;
        provenance?: string;
        scope?: any;
        dedupeConfig?: DedupeConfig;
    }): Promise<{
        action: string;
        id: any;
        conflictWith?: undefined;
        reason?: undefined;
    } | {
        action: string;
        id: any;
        conflictWith: any;
        reason: string | undefined;
    }>;
    supersede(ctx: SecurityContext, params: {
        sourceId: string;
        targetId: string;
        reason?: string;
    }): Promise<{
        success: boolean;
    }>;
}
