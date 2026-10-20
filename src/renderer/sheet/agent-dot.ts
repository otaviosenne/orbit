import type { AgentSnapshot } from '../../shared/types';
import { agentColor } from '../agent-color';
import { element } from '../dom';
import { renderSpinner } from '../spinner';

// The agent's color as a dot; while it runs, Claude's pulsing asterisk in that color, as chats show when they work.
export function renderAgentDot(agent: AgentSnapshot): HTMLSpanElement {
  const dot: HTMLSpanElement = agent.state === 'running' ? renderSpinner() : element('span', '');
  dot.classList.add('agent-dot', `agent-dot-${agent.state}`);
  dot.style.setProperty('--agent', agentColor(agent.id));
  return dot;
}
