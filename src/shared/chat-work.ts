import type { AgentSnapshot, ChatSnapshot, ShellSnapshot } from './types';

// What a chat has going right now: its turn, its agents still at work and its background shells still running.
// Closing the chat (Suspend, Restart) would cut all of it short.
export interface ChatWork {
  readonly isWorking: boolean;
  readonly agents: number;
  readonly shells: number;
}

export function chatWork(chat: ChatSnapshot): ChatWork {
  return {
    isWorking: chat.status === 'busy',
    agents: chat.agents.filter((agent: AgentSnapshot) => agent.state !== 'done').length,
    shells: chat.shells.filter((shell: ShellSnapshot) => shell.status === 'running').length,
  };
}

export function hasWork(work: ChatWork): boolean {
  return work.isWorking || work.agents > 0 || work.shells > 0;
}
