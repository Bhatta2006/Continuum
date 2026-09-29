import { generateObject } from 'ai';
import { z } from 'zod';

export interface ConflictDetector {
  checkConflict(factA: string, factB: string): Promise<{ isConflict: boolean; reason?: string }>;
}

export class LLMConflictDetector implements ConflictDetector {
  constructor(private model: any) {}

  async checkConflict(factA: string, factB: string) {
    const { object } = await generateObject({
      model: this.model,
      schema: z.object({
        isConflict: z.boolean().describe('True if the two facts directly contradict or cannot both be true simultaneously in the same context.'),
        reason: z.string().describe('A short explanation of why they conflict or why they do not.')
      }),
      prompt: `Analyze the following two facts for contradictions.
Fact A: "${factA}"
Fact B: "${factB}"

Are these facts in direct conflict? Note: refinement (Fact B adds more detail to Fact A) is NOT a conflict. Only mutually exclusive statements are conflicts.`
    });

    return object;
  }
}

// For unit testing without an LLM
export class HeuristicConflictDetector implements ConflictDetector {
  async checkConflict(factA: string, factB: string) {
    const aLower = factA.toLowerCase();
    const bLower = factB.toLowerCase();
    
    // Naive heuristic: if one is exact negation of the other
    const negations = ['do not', 'dont', "don't", 'never', 'should not', 'cannot'];
    for (const neg of negations) {
      if (aLower.includes(neg) && !bLower.includes(neg) && aLower.replace(neg, '').trim() === bLower.trim()) {
        return { isConflict: true, reason: 'Exact negation detected' };
      }
      if (bLower.includes(neg) && !aLower.includes(neg) && bLower.replace(neg, '').trim() === aLower.trim()) {
        return { isConflict: true, reason: 'Exact negation detected' };
      }
    }
    
    // Specific hardcoded test cases
    if (aLower.includes('use postgres') && bLower.includes('do not use postgres')) return { isConflict: true, reason: 'Test conflict' };
    if (aLower.includes('do not use postgres') && bLower.includes('use postgres')) return { isConflict: true, reason: 'Test conflict' };
    
    return { isConflict: false };
  }
}
