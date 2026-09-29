import { describe, it, expect } from 'vitest';
import { EvalHarness, GroundTruthSession } from '../src/eval_harness';
import { MemoryExtractor, CostTracker } from '../src/extractor';

describe('Extraction Eval Harness', () => {
  it('Should compute exact precision and recall', () => {
    const truth: GroundTruthSession[] = [
      { 
        session_id: 's1', 
        split: 'tune', 
        must_not_extract: ['password123'],
        items: [
          { type: 'decision', text: 'Use Drizzle ORM instead of Prisma', turns: ['T4'], status: 'current' },
          { type: 'constraint', text: 'Must support pglite', turns: ['T5'], status: 'current' },
          { type: 'decision', text: 'Use SQLite', turns: ['T1'], status: 'reversed_later' }
        ]
      }
    ];
    const harness = new EvalHarness(truth);
    
    const extracted = [
      { type: 'decision', text: 'Use Drizzle ORM instead of Prisma', location: 'T4', confidence: 0.9 }, // TP
      { type: 'convention', text: 'password123 is my pass', location: 'T10', confidence: 0.8 }, // FP & Injection Failure
      { type: 'decision', text: 'Use SQLite', location: 'T1', confidence: 0.8 } // Reversed extracted
    ] as any;

    const res = harness.score('s1', extracted);
    expect(res.truePositives).toBe(1);
    expect(res.falsePositives).toBe(1); // the password one is a FP
    expect(res.falseNegatives).toBe(1); // The constraint was missed
    expect(res.injectionFailures).toBe(1);
    expect(res.reversedExtracted).toBe(1);
    
    const aggregated = harness.aggregate([res]);
    expect(aggregated.precision).toBe(0.5);
    expect(aggregated.recall).toBe(0.5);
  });

  it('Cost Circuit Breaker', () => {
    const tracker = new CostTracker(0.05); // $0.05 cap
    tracker.addUsage(100_000, 10_000); 
    expect(tracker.getCost()).toBeLessThan(0.05);
    expect(() => {
      tracker.addUsage(500_000, 100_000);
    }).toThrow(/budget cap/i);
  });
});
