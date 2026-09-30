import { describe, it, expect, beforeEach } from 'vitest';
import { HandoffService, TaskState } from './index';
import { SecurityContext } from '@continuum/security';

// Mock DB
const mockTaskCapsules: any[] = [];
const mockDb = {
  insert: (schema: any) => ({
    values: (data: any) => ({
      returning: async () => {
        const entry = { id: Math.random().toString(), status: 'open', ...data };
        mockTaskCapsules.push(entry);
        return [entry];
      }
    })
  }),
  select: () => ({
    from: (schema: any) => ({
      where: async () => {
        return mockTaskCapsules.filter(c => c.status === 'open'); // simplified for testing list
      }
    })
  })
};

describe('HandoffService', () => {
  let service: HandoffService;

  beforeEach(() => {
    mockTaskCapsules.length = 0;
    service = new HandoffService(mockDb as any);
  });

  const ctx: SecurityContext = {
    identityId: 'user1',
    role: 'owner',
    workspaceId: 'ws1'
  };

  it('can checkpoint a task state', async () => {
    const state: TaskState = {
      context: 'Migrating to new DB',
      files: ['src/db.ts'],
      nextSteps: ['Run migrations']
    };

    const capsule = await service.checkpoint(ctx, 'proj1', 'DB Migration', state);
    expect(capsule.title).toBe('DB Migration');
    expect(JSON.parse(capsule.state)).toEqual(state);
    expect(mockTaskCapsules.length).toBe(1);
  });

  it('can list open tasks', async () => {
    const state: TaskState = {
      context: 'Feature X',
      files: [],
      nextSteps: ['Write tests']
    };

    await service.checkpoint(ctx, 'proj1', 'Feature X', state);
    
    const tasks = await service.listOpenTasks(ctx, 'proj1');
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Feature X');
    expect(tasks[0].state).toEqual(state);
  });
});
