import { get_encoding, Tiktoken } from 'tiktoken';

export interface MemoryItem {
  id: string;
  type: string;
  content: string;
}

export interface TaskCapsule {
  title: string;
  state: {
    context: string;
    files: string[];
    nextSteps: string[];
    blockedOn?: string;
  };
}

export interface AssemblyResult {
  content: string;
  tokensUsed: number;
  memoriesIncluded: number;
  memoriesOmitted: number;
}

export class ContextAssembler {
  private enc: Tiktoken;

  constructor(encodingName: 'cl100k_base' | 'p50k_base' | 'r50k_base' = 'cl100k_base') {
    this.enc = get_encoding(encodingName);
  }

  private countTokens(text: string): number {
    const tokens = this.enc.encode(text);
    return tokens.length;
  }

  private formatCapsule(capsule: TaskCapsule): string {
    let out = `## Task Capsule: ${capsule.title}\n`;
    out += `### Context\n${capsule.state.context}\n`;
    out += `### Files\n${capsule.state.files.map(f => `- ${f}`).join('\n')}\n`;
    out += `### Next Steps\n${capsule.state.nextSteps.map(s => `- ${s}`).join('\n')}\n`;
    if (capsule.state.blockedOn) {
      out += `### Blocked On\n${capsule.state.blockedOn}\n`;
    }
    return out;
  }

  private formatMemory(memory: MemoryItem): string {
    return `[${memory.type.toUpperCase()}] ${memory.content}`;
  }

  public assemble(
    budget: number,
    brief: string,
    memories: MemoryItem[],
    capsule?: TaskCapsule
  ): AssemblyResult {
    // 1. Mandatory core (Brief)
    let coreText = `${brief}\n\n`;
    
    // 2. Add Task Capsule if present
    if (capsule) {
      coreText += `${this.formatCapsule(capsule)}\n\n`;
    }

    let currentTokens = this.countTokens(coreText);

    // If core itself exceeds budget, we just have to return it (though ideally we'd throw or truncate, but core shouldn't exceed typical budgets)
    if (currentTokens > budget) {
      return {
        content: coreText.trim(),
        tokensUsed: currentTokens,
        memoriesIncluded: 0,
        memoriesOmitted: memories.length,
      };
    }

    // 3. Pack memories
    let memoriesText = `## Retrieved Memories\n`;
    let memoriesIncluded = 0;
    
    const headerTokens = this.countTokens(memoriesText);
    if (currentTokens + headerTokens > budget && memories.length > 0) {
      // Cannot even fit the header
      return {
        content: coreText.trim(),
        tokensUsed: currentTokens,
        memoriesIncluded: 0,
        memoriesOmitted: memories.length,
      };
    }
    
    if (memories.length > 0) {
      currentTokens += headerTokens;
      coreText += memoriesText;
    }

    for (const memory of memories) {
      const memString = `- ${this.formatMemory(memory)}\n`;
      const memTokens = this.countTokens(memString);

      if (currentTokens + memTokens <= budget) {
        coreText += memString;
        currentTokens += memTokens;
        memoriesIncluded++;
      } else {
        // Stop packing if we hit the limit
        // Optionally we could continue to see if a smaller memory fits, but usually they are ranked by relevance.
        // Assuming `memories` are ordered by relevance, we stop.
        break;
      }
    }

    return {
      content: coreText.trim(),
      tokensUsed: currentTokens,
      memoriesIncluded,
      memoriesOmitted: memories.length - memoriesIncluded,
    };
  }
}
