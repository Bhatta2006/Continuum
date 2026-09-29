import { z } from 'zod';

export type Role = 'owner' | 'admin' | 'editor' | 'viewer' | 'agent';
export type AgentPermission = 'read-only' | 'propose-only' | 'write';
export type Action = 'read' | 'write' | 'propose' | 'delete';
export type ResourceType = 'workspace' | 'project' | 'memory_item' | 'audit_log';

export interface SecurityContext {
  identityId: string;
  toolAccountId?: string;
  role: Role;
  agentPermission?: AgentPermission; // Only present if role is 'agent'
  workspaceId: string;
}

export interface PolicyRequest {
  action: Action;
  resourceType: ResourceType;
  projectId?: string; // If checking access to a specific project
}

export type PolicyResult = 
  | { allowed: true }
  | { allowed: false; reason: string };

export class PolicyEngine {
  
  static evaluate(ctx: SecurityContext, req: PolicyRequest): PolicyResult {
    // Audit logs are strictly append-only in DB. Application layer cannot read/write/delete them directly through standard user endpoints
    // (Only system-level read for reporting, which we assume requires 'owner')
    if (req.resourceType === 'audit_log') {
      if (req.action !== 'read') return { allowed: false, reason: 'Audit logs are immutable.' };
      if (ctx.role !== 'owner') return { allowed: false, reason: 'Only owners can read audit logs.' };
    }

    // Agent specific policies
    if (ctx.role === 'agent') {
      const permission = ctx.agentPermission || 'read-only';
      
      if (req.action === 'delete') {
        return { allowed: false, reason: 'Agents cannot delete resources.' };
      }
      
      if (req.action === 'write') {
        if (permission === 'read-only') return { allowed: false, reason: 'Agent is read-only.' };
        if (permission === 'propose-only') return { allowed: false, reason: 'Agent can only propose writes.' };
      }

      if (req.action === 'propose') {
        if (permission === 'read-only') return { allowed: false, reason: 'Agent is read-only.' };
      }
    }

    // Role-based access control for human users
    switch (ctx.role) {
      case 'viewer':
        if (req.action !== 'read') return { allowed: false, reason: 'Viewers can only read.' };
        break;
      case 'editor':
        if (req.action === 'delete') return { allowed: false, reason: 'Editors cannot delete resources.' };
        break;
      case 'admin':
      case 'owner':
        // Full access (except immutable things handled above)
        break;
    }

    return { allowed: true };
  }

  static assert(ctx: SecurityContext, req: PolicyRequest): void {
    const res = this.evaluate(ctx, req);
    if (!res.allowed) {
      throw new Error(`Unauthorized: ${res.reason}`);
    }
  }
}
