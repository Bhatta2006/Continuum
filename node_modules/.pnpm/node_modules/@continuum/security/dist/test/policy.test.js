"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const policy_1 = require("../src/policy");
(0, vitest_1.describe)('Policy Engine', () => {
    (0, vitest_1.it)('should deny audit log modification to everyone, and read to non-owners', () => {
        const ctx = { identityId: '1', role: 'admin', workspaceId: 'w1' };
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'audit_log' }).allowed).toBe(false);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'audit_log' }).allowed).toBe(false);
        const ownerCtx = { identityId: '1', role: 'owner', workspaceId: 'w1' };
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ownerCtx, { action: 'read', resourceType: 'audit_log' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ownerCtx, { action: 'write', resourceType: 'audit_log' }).allowed).toBe(false);
    });
    (0, vitest_1.it)('should enforce read-only agents', () => {
        const ctx = { identityId: '1', role: 'agent', agentPermission: 'read-only', workspaceId: 'w1' };
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(false);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'propose', resourceType: 'memory_item' }).allowed).toBe(false);
    });
    (0, vitest_1.it)('should enforce propose-only agents', () => {
        const ctx = { identityId: '1', role: 'agent', agentPermission: 'propose-only', workspaceId: 'w1' };
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'propose', resourceType: 'memory_item' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(false);
    });
    (0, vitest_1.it)('should enforce write agents', () => {
        const ctx = { identityId: '1', role: 'agent', agentPermission: 'write', workspaceId: 'w1' };
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'propose', resourceType: 'memory_item' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(true);
        // Agents can never delete
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'delete', resourceType: 'memory_item' }).allowed).toBe(false);
    });
    (0, vitest_1.it)('should allow admins and owners full access (except audit logs)', () => {
        const ctx = { identityId: '1', role: 'admin', workspaceId: 'w1' };
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'delete', resourceType: 'memory_item' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(true);
    });
    (0, vitest_1.it)('should restrict viewers to read-only', () => {
        const ctx = { identityId: '1', role: 'viewer', workspaceId: 'w1' };
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'read', resourceType: 'memory_item' }).allowed).toBe(true);
        (0, vitest_1.expect)(policy_1.PolicyEngine.evaluate(ctx, { action: 'write', resourceType: 'memory_item' }).allowed).toBe(false);
    });
    (0, vitest_1.it)('should assert and throw on denied access (fail closed)', () => {
        const ctx = { identityId: '1', role: 'viewer', workspaceId: 'w1' };
        (0, vitest_1.expect)(() => {
            policy_1.PolicyEngine.assert(ctx, { action: 'write', resourceType: 'memory_item' });
        }).toThrow(/Unauthorized/);
    });
});
