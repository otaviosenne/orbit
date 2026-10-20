import type { AgentSnapshot, TranscriptItem } from '../../shared/types';
import type { DemoAgentSpec } from '../demo-agents';
import { findDemoChat } from '../demo-chats';
import { TranscriptBuilder } from '../transcript-builder';

export function demoAgentTranscript(sessionId: unknown, agentId: unknown): TranscriptItem[] {
  const agent: DemoAgentSpec | undefined = findDemoChat(sessionId)?.agents.find((candidate: DemoAgentSpec) => candidate.id === agentId);
  return agent === undefined ? [] : agentTranscript(agent);
}

// Every agent tells the same short story with its own task as the prompt: enough to show what the agent view looks like.
function agentTranscript(agent: Pick<AgentSnapshot, 'id' | 'description'>): TranscriptItem[] {
  return new TranscriptBuilder(`agent-${agent.id}`)
    .user(3, `${agent.description}. Report what you find in a short list.`)
    .tools(2, [
      { name: 'Glob', summary: 'src/**/*.tsx', input: '{\n  "pattern": "src/**/*.tsx"\n}', output: '48 files' },
      { name: 'Grep', summary: 'export function', input: '{\n  "pattern": "export function"\n}', output: '112 matches in 41 files' },
    ])
    .assistant(1, `Working on it: **${agent.description.toLowerCase()}**. Halfway through the list.`)
    .build();
}
