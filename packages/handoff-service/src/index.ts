import { taskCapsules, eq, and, NodePgDatabase } from '@continuum/db';
import { SecurityContext, PolicyEngine } from '@continuum/security';
import { z } from 'zod';

export const TaskStateSchema = z.object({
  context: z.string(),
  files: z.array(z.string()),
  nextSteps: z.array(z.string()),
  blockedOn: z.string().optional()
});

export type TaskState = z.infer<typeof TaskStateSchema>;

export class HandoffService {
  constructor(private database: NodePgDatabase<any>) {}

  async checkpoint(ctx: SecurityContext, projectId: string, title: string, state: TaskState) {
    PolicyEngine.assert(ctx, { action: 'write', resourceType: 'memory_item', projectId });

    const stateStr = JSON.stringify(state);

    const [capsule] = await this.database.insert(taskCapsules).values({
      projectId,
      title,
      state: stateStr,
      assigneeId: ctx.identityId !== 'unknown' && ctx.identityId !== 'anonymous' ? ctx.identityId : undefined
    }).returning();

    return capsule;
  }

  async resume(ctx: SecurityContext, projectId: string, capsuleId: string) {
    PolicyEngine.assert(ctx, { action: 'read', resourceType: 'memory_item', projectId });

    const [capsule] = await this.database.select().from(taskCapsules)
      .where(and(
        eq(taskCapsules.id, capsuleId),
        eq(taskCapsules.projectId, projectId)
      ));

    if (!capsule) {
      throw new Error('Task capsule not found');
    }

    return {
      ...capsule,
      state: JSON.parse(capsule.state) as TaskState
    };
  }

  async listOpenTasks(ctx: SecurityContext, projectId: string) {
    PolicyEngine.assert(ctx, { action: 'read', resourceType: 'memory_item', projectId });

    const tasks = await this.database.select().from(taskCapsules)
      .where(and(
        eq(taskCapsules.projectId, projectId),
        eq(taskCapsules.status, 'open')
      ));

    return tasks.map((t: any) => ({
      ...t,
      state: JSON.parse(t.state) as TaskState
    }));
  }
}

export * from './miner';

