import type { AgentSnapshot, ShellSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';
import { CLOSE_ICON } from '../icons';
import { activeAgents } from '../views/agent-rows';
import { renderAgentDot } from './agent-dot';
import { AgentStopPopover } from './agent-stop-popover';
import { PendingStops } from './pending-stops';
import { renderShellRow } from './shell-row';
import type { StripColumnKind } from './strip-column';
import { renderStripColumn, toggledColumn } from './strip-column';

export type AgentOpened = (agentId: string) => void;
export type AgentStopConfirmed = (agentId: string) => void;

const PRIMARY_BUTTON: number = 0;
// A click with no pointer behind it came from the keyboard.
const KEYBOARD_CLICK_DETAIL: number = 0;
const AGENT_ATTRIBUTE: string = 'agent';
const STOP_ATTRIBUTE: string = 'agentStop';
const CONFIRMING_CLASS: string = 'is-confirming';
// Agents and background shells side by side; with only one kind the strip stays a single column.
const SPLIT_CLASS: string = 'is-split';
// Matches the panel's other open/close transitions; long enough to read as sliding, short enough not to wait on.
const SLIDE_MS: number = 220;
const SLIDE_EASING: string = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const REDUCED_MOTION: string = '(prefers-reduced-motion: reduce)';

// The chat's running agents and background shells above its thread; an agent opens its transcript, its X stops it.
export class AgentStrip {
  private listed: readonly AgentSnapshot[] = [];
  private agents: readonly AgentSnapshot[] = [];
  private shells: readonly ShellSnapshot[] = [];
  private currentAgentId: string | null = null;
  private now: number = 0;
  private readonly expanded: Set<StripColumnKind> = new Set();
  private readonly stopping: PendingStops = new PendingStops();
  private readonly popover: AgentStopPopover;

  // Rows are rebuilt every poll, so a full click (down + up) could straddle a rebuild and be lost.
  constructor(private readonly root: HTMLElement, onOpen: AgentOpened, onStop: AgentStopConfirmed) {
    this.popover = new AgentStopPopover(onStop, (): void => this.markConfirming(null));
    root.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (event.button !== PRIMARY_BUTTON) return;
      const target: HTMLElement = event.target as HTMLElement;
      // Checked first: the X sits inside the agent's item, which would otherwise open the agent.
      const stop: HTMLElement | null = target.closest<HTMLElement>(`[data-agent-stop]`);
      if (stop !== null) return this.askToStop(stop);
      const column: StripColumnKind | null = toggledColumn(target);
      if (column !== null) return this.toggle(column);
      const agentId: string | undefined = target.closest<HTMLElement>(`[data-${AGENT_ATTRIBUTE}]`)?.dataset[AGENT_ATTRIBUTE];
      if (agentId !== undefined) onOpen(agentId);
    });
    root.addEventListener('click', (event: MouseEvent): void => {
      const stop: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(`[data-agent-stop]`);
      if (event.detail === KEYBOARD_CLICK_DETAIL && stop !== null) this.askToStop(stop);
    });
  }

  show(agents: readonly AgentSnapshot[], shells: readonly ShellSnapshot[], currentAgentId: string | null, now: number): void {
    this.listed = activeAgents(agents);
    this.shells = [...shells].sort((a: ShellSnapshot, b: ShellSnapshot) => a.startedAt - b.startedAt);
    this.currentAgentId = currentAgentId;
    this.now = now;
    this.render();
  }

  // A different chat starts folded again.
  reset(): void {
    this.expanded.clear();
    this.popover.dismiss();
  }

  // Hidden at once; it stays hidden while the chat confirms, and comes back if it never does.
  markStopping(agentId: string): void {
    this.stopping.hide(agentId, Date.now());
    this.render();
  }

  unmarkStopping(agentId: string): void {
    this.stopping.restore(agentId);
    this.render();
  }

  private askToStop(button: HTMLElement): void {
    const agentId: string | undefined = button.dataset[STOP_ATTRIBUTE];
    const agent: AgentSnapshot | undefined = this.agents.find((candidate: AgentSnapshot) => candidate.id === agentId);
    if (agent === undefined) return;
    this.popover.open(agent.id, agent.description, button.getBoundingClientRect());
    this.markConfirming(agent.id);
  }

  // Keeps the X of the agent being confirmed showing while the pointer is away on the popover.
  private markConfirming(agentId: string | null): void {
    for (const item of this.root.querySelectorAll<HTMLElement>('.agent-strip-item')) {
      item.classList.toggle(CONFIRMING_CLASS, agentId !== null && item.dataset[AGENT_ATTRIBUTE] === agentId);
    }
  }

  // The strip slides from its old height to its new one, so "more" rolls open and "less" rolls closed.
  private toggle(column: StripColumnKind): void {
    const from: number = this.root.offsetHeight;
    if (!this.expanded.delete(column)) this.expanded.add(column);
    this.render();
    const to: number = this.root.offsetHeight;
    if (window.matchMedia(REDUCED_MOTION).matches) return;
    this.root.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: SLIDE_MS, easing: SLIDE_EASING });
  }

  private render(): void {
    this.agents = this.stopping.visible(this.listed, this.now);
    // An agent that finished while its stop was being confirmed has nothing left to stop.
    const confirming: string | null = this.popover.openFor;
    if (confirming !== null && !this.agents.some((agent: AgentSnapshot) => agent.id === confirming)) this.popover.dismiss();
    const columns: HTMLElement[] = [];
    if (this.agents.length > 0) columns.push(this.renderColumn('agents', this.agents.map((agent: AgentSnapshot) => this.renderItem(agent))));
    if (this.shells.length > 0) columns.push(this.renderColumn('shells', this.shells.map((shell: ShellSnapshot) => renderShellRow(shell, this.now))));
    this.root.hidden = columns.length === 0;
    this.root.classList.toggle(SPLIT_CLASS, columns.length > 1);
    this.root.replaceChildren(...columns);
  }

  private renderColumn(kind: StripColumnKind, rows: readonly HTMLElement[]): HTMLElement {
    return renderStripColumn(kind, rows, this.expanded.has(kind));
  }

  // The row and its X are siblings: a button cannot hold another button.
  private renderItem(agent: AgentSnapshot): HTMLElement {
    const item: HTMLDivElement = element('div', `agent-strip-item${agent.id === this.popover.openFor ? ` ${CONFIRMING_CLASS}` : ''}`);
    item.dataset[AGENT_ATTRIBUTE] = agent.id;
    item.append(this.renderRow(agent), renderStopButton(agent));
    return item;
  }

  private renderRow(agent: AgentSnapshot): HTMLElement {
    const row: HTMLButtonElement = element('button', `agent-strip-row${agent.id === this.currentAgentId ? ' is-current' : ''}`);
    row.type = 'button';
    row.dataset[AGENT_ATTRIBUTE] = agent.id;
    row.title = `Open ${agent.description}`;
    row.append(
      renderAgentDot(agent),
      element('span', 'agent-strip-name', agent.description),
      element('span', `agent-strip-time agent-strip-${agent.state}`, agentTiming(agent, this.now)),
    );
    return row;
  }
}

function renderStopButton(agent: AgentSnapshot): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'agent-strip-stop');
  button.type = 'button';
  button.dataset[STOP_ATTRIBUTE] = agent.id;
  button.title = `Stop ${agent.description}`;
  button.setAttribute('aria-label', `Stop ${agent.description}`);
  button.innerHTML = CLOSE_ICON;
  return button;
}

function agentTiming(agent: AgentSnapshot, now: number): string {
  if (agent.state === 'quiet') return `quiet ${formatDuration(now - agent.lastActivityAt)}`;
  return formatDuration(now - agent.startedAt);
}
