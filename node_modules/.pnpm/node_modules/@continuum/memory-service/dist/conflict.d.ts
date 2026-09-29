export interface ConflictDetector {
    checkConflict(factA: string, factB: string): Promise<{
        isConflict: boolean;
        reason?: string;
    }>;
}
export declare class LLMConflictDetector implements ConflictDetector {
    private model;
    constructor(model: any);
    checkConflict(factA: string, factB: string): Promise<{
        isConflict: boolean;
        reason: string;
    }>;
}
export declare class HeuristicConflictDetector implements ConflictDetector {
    checkConflict(factA: string, factB: string): Promise<{
        isConflict: boolean;
        reason: string;
    } | {
        isConflict: boolean;
        reason?: undefined;
    }>;
}
