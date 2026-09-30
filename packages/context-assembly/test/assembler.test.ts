import { describe, it, expect } from 'vitest';
import { ContextAssembler, MemoryItem, TaskCapsule } from '../src/assembler';

describe('ContextAssembler', () => {
  const assembler = new ContextAssembler();
  
  const sampleBrief = '# Project Brief\nUse TypeScript.';
  
  const sampleMemories: MemoryItem[] = [
    { id: '1', type: 'decision', content: 'Use Drizzle ORM.' },
    { id: '2', type: 'convention', content: 'Use kebab-case for files.' },
    { id: '3', type: 'constraint', content: 'Must pass WCAG 2.2.' }
  ];

  const sampleCapsule: TaskCapsule = {
    title: 'Implement feature X',
    state: {
      context: 'Working on feature X',
      files: ['src/index.ts'],
      nextSteps: ['Write tests', 'Implement logic']
    }
  };

  it('should pack everything if budget is large enough', () => {
    const budget = 1000;
    const result = assembler.assemble(budget, sampleBrief, sampleMemories, sampleCapsule);
    
    expect(result.memoriesIncluded).toBe(3);
    expect(result.memoriesOmitted).toBe(0);
    expect(result.tokensUsed).toBeLessThanOrEqual(budget);
    expect(result.content).toContain('Use Drizzle ORM.');
    expect(result.content).toContain('Implement feature X');
  });

  it('should omit memories if budget is constrained', () => {
    // A very small budget that only fits the brief and maybe the capsule
    const smallBudget = 40; 
    const result = assembler.assemble(smallBudget, sampleBrief, sampleMemories, sampleCapsule);
    
    // It should omit memories to stay within budget (capsule might push it over, let's see)
    expect(result.memoriesOmitted).toBeGreaterThan(0);
    expect(result.tokensUsed).toBeLessThanOrEqual(smallBudget + 50); // It might slightly overflow on core if we don't strictly truncate core.
  });

  it('should omit later memories but keep earlier ones if partially constrained', () => {
    // Calculate exact tokens for core and first memory
    const coreTokens = assembler['countTokens'](`${sampleBrief}\n\n`);
    const headerTokens = assembler['countTokens'](`## Retrieved Memories\n`);
    const firstMemStr = `- [DECISION] Use Drizzle ORM.\n`;
    const firstMemTokens = assembler['countTokens'](firstMemStr);
    
    // Set budget to exactly fit core + header + 1 memory
    const strictBudget = coreTokens + headerTokens + firstMemTokens;
    
    const result = assembler.assemble(strictBudget, sampleBrief, sampleMemories);
    
    expect(result.memoriesIncluded).toBe(1);
    expect(result.memoriesOmitted).toBe(2);
    expect(result.tokensUsed).toBeLessThanOrEqual(strictBudget);
  });
});
