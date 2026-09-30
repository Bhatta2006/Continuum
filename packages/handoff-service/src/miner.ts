import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { TaskStateSchema, TaskState } from './index';

export class SessionMiner {
  async mineLog(transcriptText: string): Promise<TaskState> {
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: TaskStateSchema,
      prompt: `You are an AI assistant tasked with mining a conversational transcript to extract the current task state.
Analyze the provided transcript of an agent session and extract:
1. context: A summary of the overall goal and what has been accomplished so far.
2. files: A list of the absolute or relative file paths that were actively modified or read in relation to the main goal.
3. nextSteps: A list of strings describing the immediate next steps or pending tasks.
4. blockedOn: (Optional) Any specific blocker, error, or missing dependency preventing progress.

Transcript:
"""
${transcriptText}
"""`
    });

    return object;
  }
}
