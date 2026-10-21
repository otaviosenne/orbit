import type { ShellOutput, ShellSnapshot } from '../../shared/types';
import { element } from '../dom';
import { formatClock, formatDuration } from '../format';
import { shellName, shellStatusWord } from './shell-row';

// Background output changes by the second; this keeps the tail fresh without reading the file on every frame.
const OUTPUT_REFRESH_MS: number = 2000;
// Within this of the bottom counts as reading the end, so new output keeps it there.
const STICK_TO_BOTTOM_PX: number = 24;
const CLOSE_KEY: string = 'Escape';
const ANCHOR_GAP_PX: number = 4;
const EDGE_MARGIN_PX: number = 8;
const NO_OUTPUT: string = 'No output yet';
const EARLIER_CUT: string = '… earlier output not shown\n';

export type OutputLoader = (sessionId: string, taskId: string) => Promise<ShellOutput | null>;

interface OpenShell {
  readonly sessionId: string;
  shell: ShellSnapshot;
}

// A shell row's details beside it: its command as written, when it ran, how it ended, and the end of its output.
export class ShellDetails {
  private readonly root: HTMLDivElement = element('div', 'card-menu shell-details');
  private readonly meta: HTMLDivElement = element('div', 'shell-details-meta');
  private readonly command: HTMLPreElement = element('pre', 'shell-details-code');
  private readonly output: HTMLPreElement = element('pre', 'shell-details-code shell-details-output');
  private readonly title: HTMLDivElement = element('div', 'shell-details-title');
  private open: OpenShell | null = null;
  private timer: number | undefined;

  constructor(private readonly loadOutput: OutputLoader) {
    this.root.append(this.title, this.meta, element('div', 'shell-details-label', 'Command'), this.command, element('div', 'shell-details-label', 'Output'), this.output);
    document.body.append(this.root);
    // A press on any shell row is left to the strip, which toggles this or opens another shell.
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      const target: Element | null = event.target instanceof Element ? event.target : null;
      if (target !== null && !this.root.contains(target) && target.closest('[data-shell]') === null) this.close();
    }, true);
    window.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== CLOSE_KEY || this.open === null) return;
      event.stopPropagation();
      this.close();
    }, true);
  }

  get openFor(): string | null {
    return this.open?.shell.id ?? null;
  }

  show(sessionId: string, shell: ShellSnapshot, anchor: DOMRect, now: number): void {
    this.open = { sessionId, shell };
    this.title.textContent = shellName(shell);
    this.command.textContent = shell.command.trim();
    this.output.textContent = '';
    this.renderMeta(now);
    this.root.classList.add('is-open');
    this.place(anchor);
    void this.refreshOutput(true);
    this.restartTimer();
  }

  // Each poll brings the shell's latest state; one last read once it ends catches what it wrote last.
  update(shell: ShellSnapshot | undefined, now: number): void {
    if (this.open === null || shell === undefined || shell.id !== this.open.shell.id) return;
    const justEnded: boolean = this.open.shell.status === 'running' && shell.status !== 'running';
    this.open.shell = shell;
    this.renderMeta(now);
    if (justEnded) void this.refreshOutput(false);
    this.restartTimer();
  }

  close(): void {
    if (this.open === null) return;
    this.open = null;
    window.clearInterval(this.timer);
    this.root.classList.remove('is-open');
  }

  private renderMeta(now: number): void {
    const shell: ShellSnapshot | undefined = this.open?.shell;
    if (shell === undefined) return;
    const endedAt: number = shell.endedAt ?? now;
    const exit: string = shell.exitCode === null ? '' : ` (exit code ${shell.exitCode})`;
    this.meta.replaceChildren(
      metaItem('Status', `${shellStatusWord(shell)}${exit}`, `shell-details-${shell.status}`),
      metaItem('Started', formatClock(shell.startedAt)),
      metaItem(shell.status === 'running' ? 'Running for' : 'Ran for', formatDuration(endedAt - shell.startedAt)),
    );
  }

  private restartTimer(): void {
    window.clearInterval(this.timer);
    if (this.open?.shell.status !== 'running') return;
    this.timer = window.setInterval((): void => void this.refreshOutput(false), OUTPUT_REFRESH_MS);
  }

  private async refreshOutput(isFirst: boolean): Promise<void> {
    const open: OpenShell | null = this.open;
    if (open === null) return;
    const result: ShellOutput | null = await this.loadOutput(open.sessionId, open.shell.id).catch((): null => null);
    if (this.open?.shell.id !== open.shell.id) return;
    const wasAtBottom: boolean = this.output.scrollHeight - this.output.scrollTop - this.output.clientHeight < STICK_TO_BOTTOM_PX;
    this.output.textContent = outputText(result);
    this.output.classList.toggle('is-empty', result === null || result.text.trim() === '');
    if (isFirst || wasAtBottom) this.output.scrollTop = this.output.scrollHeight;
  }

  // Beside the row, under it, kept inside the window; above it when there is no room below.
  private place(anchor: DOMRect): void {
    const width: number = this.root.offsetWidth;
    const height: number = this.root.offsetHeight;
    const left: number = Math.min(Math.max(EDGE_MARGIN_PX, anchor.right - width), window.innerWidth - width - EDGE_MARGIN_PX);
    const below: number = anchor.bottom + ANCHOR_GAP_PX;
    const top: number = below + height <= window.innerHeight - EDGE_MARGIN_PX ? below : anchor.top - ANCHOR_GAP_PX - height;
    this.root.style.left = `${left}px`;
    this.root.style.top = `${Math.max(EDGE_MARGIN_PX, top)}px`;
  }
}

function metaItem(label: string, value: string, valueClass: string = ''): HTMLElement {
  const item: HTMLSpanElement = element('span', 'shell-details-meta-item');
  item.append(element('span', 'shell-details-label', label), element('span', valueClass, value));
  return item;
}

function outputText(result: ShellOutput | null): string {
  if (result === null || result.text.trim() === '') return NO_OUTPUT;
  return `${result.isTruncated ? EARLIER_CUT : ''}${result.text.replace(/\n+$/, '')}`;
}
