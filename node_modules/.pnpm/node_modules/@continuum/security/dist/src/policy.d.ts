export type Role = 'owner' | 'admin' | 'editor' | 'viewer' | 'agent';
export type AgentPermission = 'read-only' | 'propose-only' | 'write';
export type Action = 'read' | 'write' | 'propose' | 'delete';
export type ResourceType = 'workspace' | 'project' | 'memory_item' | 'audit_log';
export interface SecurityContext {
    identityId: string;
    toolAccountId?: string;
    role: Role;
    agentPermission?: AgentPermission;
    workspaceId: string;
}
export interface PolicyRequest {
    action: Action;
    resourceType: ResourceType;
    projectId?: string;
}
export type PolicyResult = {
    allowed: true;
} | {
    allowed: false;
    reason: string;
};
export declare class PolicyEngine {
    static evaluate(ctx: SecurityContext, req: PolicyRequest): PolicyResult;
    static assert(ctx: SecurityContext, req: PolicyRequest): void;
}
