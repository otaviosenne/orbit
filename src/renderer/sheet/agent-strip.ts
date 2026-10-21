import type { AgentSnapshot, ShellSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatDuration } from '../format';
import { CLOSE_ICON } from '../icons';
import { activeAgents } from '../views/agent-rows';
import { renderAgentDot } from './agent-dot';
import { PendingStops } from './pending-stops';
import { ShellColumn } from './shell-column';
import type { ProblemReporter } from './shell-column';
import type { StripColumnKind } from './strip-column';
import { renderStripColumn, toggledColumn } from './strip-column';
import { StripConfirmPopover } from './strip-confirm-popover';

// What the strip asks of its owner: open an agent's transcript, stop an agent, and show a problem.
export interface StripActions {
  readonly openAgent: (agentId: string) => void;
  readonly stopAgent: (agentId: string) => void;
  readonly report: ProblemReporter;
}

const PRIMARY_BUTTON: number = 0;
// A click with no pointer behind it came from the keyboard.
const KEYBOARD_CLICK_DETAIL: number = 0;
const AGENT_ATTRIBUTE: string = 'agent';
const STOP_ATTRIBUTE: string = 'agentStop';
const CONFIRM_KEY_PREFIX: string = 'agent:';
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
  private currentAgentId: string | null = null;
  private now: number = 0;
  private readonly expanded: Set<StripColumnKind> = new Set();
  private readonly stopping: PendingStops = new PendingStops();
  // Closing only drops the highlight: rebuilding rows here would detach the X being pressed before it is measured.
  private readonly confirm: StripConfirmPopover = new StripConfirmPopover((): void => this.clearConfirming());
  private readonly shells: ShellColumn;

  // Rows are rebuilt every poll, so a full click (down + up) could straddle a rebuild and be lost.
  constructor(private readonly root: HTMLElement, private readonly actions: StripActions) {
    this.shells = new ShellColumn(this.confirm, (): void => this.render(), actions.report);
    root.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (event.button === PRIMARY_BUTTON) this.press(event.target as HTMLElement);
    });
    root.addEventListener('click', (event: MouseEvent): void => {
      const stop: HTMLElement | null = (event.target as HTMLElement).closest<HTMLElement>(`[data-agent-stop]`);
      if (event.detail === KEYBOARD_CLICK_DETAIL && stop !== null) this.askToStop(stop);
    });
  }

  show(sessionId: string, agents: readonly AgentSnapshot[], shells: readonly ShellSnapshot[], currentAgentId: string | null, now: number): void {
    this.listed = activeAgents(agents);
    this.shells.update(sessionId, shells, now);
    this.currentAgentId = currentAgentId;
    this.now = now;
    this.render();
  }

  // A different chat starts folded again.
  reset(): void {
    this.expanded.clear();
    this.confirm.dismiss();
    this.shells.reset();
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

  // An X is checked before its row: it sits inside the row's item, which would otherwise open the agent.
  private press(target: HTMLElement): void {
    const stop: HTMLElement | null = target.closest<HTMLElement>(`[data-agent-stop]`);
    if (stop !== null) return this.askToStop(stop);
    if (this.shells.handlePress(target)) return;
    const column: StripColumnKind | null = toggledColumn(target);
    if (column !== null) return this.toggle(column);
    const agentId: string | undefined = target.closest<HTMLElement>(`[data-${AGENT_ATTRIBUTE}]`)?.dataset[AGENT_ATTRIBUTE];
    if (agentId !== undefined) this.actions.openAgent(agentId);
  }

  private askToStop(button: HTMLElement): void {
    const agentId: string | undefined = button.dataset[STOP_ATTRIBUTE];
    const agent: AgentSnapshot | undefined = this.agents.find((candidate: AgentSnapshot) => candidate.id === agentId);
    if (agent === undefined || this.confirm.justClosed(confirmKey(agent.id))) return;
    this.confirm.open(
      { key: confirmKey(agent.id), title: agent.description, action: 'Stop agent', run: (): void => this.actions.stopAgent(agent.id) },
      button.getBoundingClientRect(),
    );
    this.render();
  }

  private clearConfirming(): void {
    for (const item of this.root.querySelectorAll<HTMLElement>('.agent-strip-item.is-confirming')) item.classList.remove('is-confirming');
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
    const confirming: string | null = this.confirm.openFor;
    const isAgentConfirm: boolean = confirming?.startsWith(CONFIRM_KEY_PREFIX) === true;
    if (isAgentConfirm && !this.agents.some((agent: AgentSnapshot) => confirmKey(agent.id) === confirming)) this.confirm.dismiss();
    const shellRows: HTMLElement[] = this.shells.rows();
    const columns: HTMLElement[] = [];
    if (this.agents.length > 0) columns.push(this.renderColumn('agents', this.agents.map((agent: AgentSnapshot) => this.renderItem(agent))));
    if (shellRows.length > 0) columns.push(this.renderColumn('shells', shellRows));
    this.root.hidden = columns.length === 0;
    this.root.classList.toggle(SPLIT_CLASS, columns.length > 1);
    this.root.replaceChildren(...columns);
  }

  private renderColumn(kind: StripColumnKind, rows: readonly HTMLElement[]): HTMLElement {
    return renderStripColumn(kind, rows, this.expanded.has(kind));
  }

  // The row and its X are siblings: a button cannot hold another button.
  private renderItem(agent: AgentSnapshot): HTMLElement {
    const item: HTMLDivElement = element('div', `agent-strip-item${this.confirm.openFor === confirmKey(agent.id) ? ' is-confirming' : ''}`);
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

function confirmKey(agentId: string): string {
  return `${CONFIRM_KEY_PREFIX}${agentId}`;
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
