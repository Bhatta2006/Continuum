import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryDeduplicator } from '../src/dedupe';
import { MockEmbeddingProvider } from '../src/embedding';
import { HeuristicConflictDetector } from '../src/conflict';
import { MemoryService } from '../src/memory';
import { MemoryRetrieval } from '../src/retrieval';
import { SecurityContext } from '@continuum/security';

describe('Memory Core & Dedupe', () => {
  let dbMock: any;
  let dedupe: MemoryDeduplicator;
  let embedder: MockEmbeddingProvider;
  let service: MemoryService;
  let conflict: HeuristicConflictDetector;

  const ctx: SecurityContext = {
    identityId: 'u1',
    role: 'admin',
    workspaceId: 'w1'
  };

  beforeEach(() => {
    dbMock = {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'm1' }]) }) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) })
    };
    embedder = new MockEmbeddingProvider();
    dedupe = new MemoryDeduplicator(dbMock, embedder);
    conflict = new HeuristicConflictDetector();
    service = new MemoryService(dbMock, embedder, dedupe, conflict);
  });

  it('Dedupe: Should not merge opposite meanings despite semantic similarity', async () => {
    const factA = 'Use Postgres';
    const factB = 'Do not use Postgres'; // Contains negation

    // Exact match returns empty
    dbMock.execute.mockResolvedValueOnce({ rows: [] }); 
    // Semantic match returns factA because distance < threshold (mocking DB behavior)
    dbMock.execute.mockResolvedValueOnce({ rows: [{ id: '1', content: factA, distance: 0.01 }] });

    const result = await dedupe.findDuplicate('proj1', factB, { similarityThreshold: 0.1 });
    
    // Because of hasOppositeMeaningHeuristic, it should skip factA and return null
    expect(result).toBeNull();
  });

  it('Dedupe: Should merge similar meaning without negations', async () => {
    const factA = 'Use Postgres';
    const factB = 'We should use Postgres';

    // Exact empty
    dbMock.execute.mockResolvedValueOnce({ rows: [] }); 
    // Semantic match returns factA
    dbMock.execute.mockResolvedValueOnce({ rows: [{ id: '1', content: factA, distance: 0.01 }] });

    const result = await dedupe.findDuplicate('proj1', factB, { similarityThreshold: 0.1 });
    expect(result).not.toBeNull();
    expect(result?.id).toBe('1');
  });

  it('Conflict Detection (L-2): Should flag contradictions', async () => {
    // Propose factB while factA is active
    const factB = 'Do not use Postgres';
    
    // Dedupe exact
    dbMock.execute.mockResolvedValueOnce({ rows: [] }); 
    // Dedupe semantic
    dbMock.execute.mockResolvedValueOnce({ rows: [] });
    // Conflict detection active memories query (returns opposite fact)
    dbMock.execute.mockResolvedValueOnce({ rows: [{ id: 'm-active-1', content: 'Use Postgres' }] });

    const res = await service.proposeMemory(ctx, { projectId: 'p1', content: factB, type: 'decision' });
    
    expect(res.action).toBe('quarantined');
    expect(res.reason).toBe('Exact negation detected');
    expect(dbMock.insert).toHaveBeenCalled(); // Should insert as quarantined and write audit log
  });

  it('Retrieval (R-2): Should generate correct hybrid SQL and enforce status/permissions', async () => {
    const retrieval = new MemoryRetrieval(dbMock, embedder);
    
    await retrieval.search(ctx, { query: 'test query', projectId: 'p1', status: 'active' });
    
    const call = dbMock.execute.mock.calls[0][0];
    const sqlString = JSON.stringify(call);
    
    // Check for status filter inside the query
    expect(sqlString).toContain("m.status =");
    expect(sqlString).toContain("active"); // default
    
    // Check for project filter
    expect(sqlString).toContain("m.project_id =");
    
    // Check for hybrid math
    expect(sqlString).toContain("ts_rank");
    expect(sqlString).toContain("<=>");
  });

  it('Retrieval (Isolation): Should not leak not-found or another tenants memory', async () => {
    const retrieval = new MemoryRetrieval(dbMock, embedder);
    
    // Attempting to list or get should strictly filter by project_id and tenant identity
    // E.g. get memory
    dbMock.execute.mockResolvedValueOnce({ rows: [] }); // Simulate DB returning empty due to RLS/filtering
    
    const result = await retrieval.search(ctx, { query: 'test query', projectId: 'other-tenant-proj' });
    expect(result.length).toBe(0);
    
    const sql = JSON.stringify(dbMock.execute.mock.calls[dbMock.execute.mock.calls.length - 1][0]);
    expect(sql).toContain('m.project_id ='); // project filter applied
  });

  it('Supersession: Should link source and target and mark target superseded', async () => {
    await service.supersede(ctx, { sourceId: 'new-id', targetId: 'old-id', reason: 'outdated' });
    
    // Update target status
    expect(dbMock.update).toHaveBeenCalled();
    // Insert edge and audit log
    expect(dbMock.insert).toHaveBeenCalledTimes(2);
  });
});
