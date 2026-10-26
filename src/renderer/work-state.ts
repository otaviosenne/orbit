import type { AgentSnapshot, ChatSnapshot } from '../shared/types';

// What a chat is doing for the board. A chat whose only activity is a command left running in the background still
// belongs with the working ones, but its spinner is grey: nothing is thinking, a command is just still going.
export type WorkState = 'working' | 'shell-only' | 'resting';

export function workStateOf(chat: ChatSnapshot): WorkState {
  if (chat.status === 'busy') return 'working';
  if (chat.status !== 'shell') return 'resting';
  return chat.agents.some((agent: AgentSnapshot) => agent.state === 'running') ? 'working' : 'shell-only';
}

export function isWorking(chat: ChatSnapshot): boolean {
  return workStateOf(chat) !== 'resting';
}
