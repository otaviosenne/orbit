import type { ActionResult, AgentSnapshot, ChatSnapshot } from '../../shared/types';
import { requireElement } from '../dom';
import { formatDuration } from '../format';
import { CARET_LEFT_ICON } from '../icons';
import { renderAgentDot } from './agent-dot';
import { AgentStrip } from './agent-strip';

export interface AgentTitle {
  readonly name: string;
  readonly meta: string;
}

export type ProblemReporter = (problem: string) => void;

const AGENT_MODE_CLASS: string = 'is-agent';

// Lets the panel show one of the chat's agents instead of the chat: the strip picks it, the back chevron returns.
export class AgentView {
  private readonly back: HTMLButtonElement = requireElement('#sheet-back');
  private readonly dot: HTMLElement = requireElement('#sheet-agent-dot');
  private readonly strip: AgentStrip;
  private agents: readonly AgentSnapshot[] = [];
  private sessionId: string | null = null;
  // Kept from the last poll that listed it, so an agent that drops off the list can still be read.
  private agent: AgentSnapshot | null = null;

  constructor(private readonly root: HTMLElement, private readonly onChange: () => void, private readonly report: ProblemReporter) {
    this.back.innerHTML = CARET_LEFT_ICON;
    this.back.addEventListener('click', (): void => void this.close());
    this.strip = new AgentStrip(
      requireElement('#agent-strip'),
      (agentId: string): void => this.open(agentId),
      (agentId: string): void => void this.stop(agentId),
    );
  }

  get agentId(): string | null {
    return this.agent?.id ?? null;
  }

  update(chat: ChatSnapshot, now: number): void {
    this.sessionId = chat.sessionId;
    this.agents = chat.agents;
    if (this.agent !== null) this.agent = chat.agents.find((agent: AgentSnapshot) => agent.id === this.agent?.id) ?? this.agent;
    this.strip.show(chat.agents, chat.shells, this.agentId, now);
    if (this.agent !== null) this.dot.replaceChildren(renderAgentDot(this.agent));
  }

  title(now: number): AgentTitle | null {
    if (this.agent === null) return null;
    return { name: this.agent.description, meta: `${this.agent.agentType} · ${agentStatus(this.agent, now)}` };
  }

  // Returns whether an agent was open, so Escape goes back to the chat before closing the panel.
  close(): boolean {
    if (this.agent === null) return false;
    this.show(null);
    this.onChange();
    return true;
  }

  // For a different chat or a closed panel: no agent, strip folded, nothing to announce.
  reset(): void {
    this.show(null);
    this.strip.reset();
  }

  // Also reached from outside the strip (a timeline bar), so it takes an id rather than a row.
  open(agentId: string): void {
    const agent: AgentSnapshot | undefined = this.agents.find((candidate: AgentSnapshot) => candidate.id === agentId);
    if (agent === undefined || agent.id === this.agentId) return;
    this.show(agent);
    this.onChange();
  }

  // Optimistic: the row goes at once and comes back with the reason if the chat could not stop the agent.
  private async stop(agentId: string): Promise<void> {
    const sessionId: string | null = this.sessionId;
    if (sessionId === null) return;
    this.strip.markStopping(agentId);
    const result: ActionResult = await requestStop(sessionId, agentId);
    if (result.ok) return;
    this.strip.unmarkStopping(agentId);
    this.report(`Could not stop the agent: ${result.error ?? 'unknown error'}`);
  }

  private show(agent: AgentSnapshot | null): void {
    this.agent = agent;
    this.root.classList.toggle(AGENT_MODE_CLASS, agent !== null);
    this.back.hidden = agent === null;
    this.dot.hidden = agent === null;
    this.dot.replaceChildren(...(agent === null ? [] : [renderAgentDot(agent)]));
  }
}

async function requestStop(sessionId: string, agentId: string): Promise<ActionResult> {
  try {
    return await window.radar.stopAgent(sessionId, agentId);
  } catch (error: unknown) {
    return { ok: false, method: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function agentStatus(agent: AgentSnapshot, now: number): string {
  if (agent.state === 'done') return 'Finished';
  if (agent.state === 'quiet') return `Quiet for ${formatDuration(now - agent.lastActivityAt)}`;
  return `Running for ${formatDuration(now - agent.startedAt)}`;
}
