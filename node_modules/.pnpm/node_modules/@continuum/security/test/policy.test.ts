import { describe, it, expect } from 'vitest';
import { PolicyEngine, SecurityContext, PolicyRequest } from '../src/policy';

describe('Policy Engine', () => {
  it('should deny audit log modification to everyone, and read to non-owners', () => {
    const ctx: SecurityContext = { identityId: '1', role: 'admin', workspaceId: 'w1' };
    
    expect(PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'audit_log' }).allowed).toBe(false);
    expect(PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'audit_log' }).allowed).toBe(false);
    
    const ownerCtx: SecurityContext = { identityId: '1', role: 'owner', workspaceId: 'w1' };
    expect(PolicyEngine.evaluate(ownerCtx, { action: 'read', resourceType: 'audit_log' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ownerCtx, { action: 'write', resourceType: 'audit_log' }).allowed).toBe(false);
  });

  it('should enforce read-only agents', () => {
    const ctx: SecurityContext = { identityId: '1', role: 'agent', agentPermission: 'read-only', workspaceId: 'w1' };
    
    expect(PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(false);
    expect(PolicyEngine.evaluate(ctx, { action: 'propose', resourceType: 'memory_item' }).allowed).toBe(false);
  });

  it('should enforce propose-only agents', () => {
    const ctx: SecurityContext = { identityId: '1', role: 'agent', agentPermission: 'propose-only', workspaceId: 'w1' };
    
    expect(PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ctx, { action: 'propose', resourceType: 'memory_item' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(false);
  });

  it('should enforce write agents', () => {
    const ctx: SecurityContext = { identityId: '1', role: 'agent', agentPermission: 'write', workspaceId: 'w1' };
    
    expect(PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ctx, { action: 'propose', resourceType: 'memory_item' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(true);
    // Agents can never delete
    expect(PolicyEngine.evaluate(ctx, { action: 'delete', resourceType: 'memory_item' }).allowed).toBe(false);
  });

  it('should allow admins and owners full access (except audit logs)', () => {
    const ctx: SecurityContext = { identityId: '1', role: 'admin', workspaceId: 'w1' };
    expect(PolicyEngine.evaluate(ctx, { action: 'delete', resourceType: 'memory_item' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(true);
  });

  it('should restrict viewers to read-only', () => {
    const ctx: SecurityContext = { identityId: '1', role: 'viewer', workspaceId: 'w1' };
    expect(PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
    expect(PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(false);
  });
  
  it('should assert and throw on denied access (fail closed)', () => {
    const ctx: SecurityContext = { identityId: '1', role: 'viewer', workspaceId: 'w1' };
    expect(() => {
      PolicyEngine.assert(ctx, { action: 'write', resourceType: 'memory_item' });
    }).toThrow(/Unauthorized/);
  });
});
