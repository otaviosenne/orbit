import { element } from '../../renderer/dom';
import { probeOrigin } from './origin-probe';
import type { OriginState, PowerMode, PowerPhase } from './power-progress';
import { PowerProgress } from './power-progress';

const FRAME_MS: number = 250;
const PROBE_MS: number = 1_500;
// Long enough to read 100% before the page swaps to the power-on page (or back to Orbit after a restart).
const RELOAD_DELAY_MS: number = 700;

// The same power symbol as the power-on page, so both screens read as one flow.
const POWER_GLYPH: string = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg>';
const TITLES: Readonly<Record<PowerMode, string>> = { shutdown: 'Shutting down', restart: 'Restarting' };
const PHASES: Readonly<Record<PowerPhase, string>> = {
  'closing': 'Closing Orbit and the chats…',
  'powering-off': 'Powering off…',
  'off': 'Off. Opening the power-on page…',
  'booting': 'Starting the PC…',
  'opening': 'Starting Orbit…',
  'back': 'Back on. Opening Orbit…',
  'stuck': 'The PC is still answering. Check it, then close this.',
};

// Covers Orbit Web while the PC goes down, with a percentage, then reloads: the Worker then serves the power-on
// page (after a shutdown) or Orbit again (after a restart). Started by the power buttons or by a lost tunnel.
export class PowerOverlay {
  private progress: PowerProgress | null = null;
  private readonly root: HTMLElement = element('div', 'web-power');
  private readonly title: HTMLElement = element('div', 'web-power-title');
  private readonly phase: HTMLElement = element('div', 'web-power-phase');
  private readonly percent: HTMLElement = element('div', 'web-power-percent', '0%');
  private readonly fill: HTMLElement = element('div', 'web-power-fill');
  private readonly close: HTMLButtonElement = element('button', 'button web-power-close', 'Close');
  private timers: number[] = [];

  constructor() {
    const icon: HTMLElement = element('div', 'web-power-icon');
    const glyph: HTMLElement = element('span', 'web-power-glyph');
    glyph.innerHTML = POWER_GLYPH;
    icon.append(element('span', 'web-power-ring'), element('span', 'web-power-ring'), glyph);
    const bar: HTMLElement = element('div', 'web-power-bar');
    bar.append(this.fill);
    const card: HTMLElement = element('div', 'web-power-card');
    card.append(icon, this.title, this.percent, bar, this.phase, this.close);
    this.root.append(card);
    this.root.setAttribute('role', 'progressbar');
    this.close.hidden = true;
    this.close.addEventListener('click', (): void => this.stop());
  }

  get isShowing(): boolean {
    return this.progress !== null;
  }

  start(mode: PowerMode): void {
    if (this.progress !== null) return;
    this.progress = new PowerProgress(mode, Date.now());
    this.title.textContent = TITLES[mode];
    this.root.classList.toggle('is-restart', mode === 'restart');
    document.body.append(this.root);
    this.draw();
    this.timers = [window.setInterval((): void => this.draw(), FRAME_MS), window.setInterval((): void => void this.probe(), PROBE_MS)];
  }

  // The power command was refused, so nothing is going down after all.
  stop(): void {
    this.timers.forEach((timer: number): void => window.clearInterval(timer));
    this.timers = [];
    this.progress = null;
    this.close.hidden = true;
    this.root.remove();
  }

  // A tunnel already seen gone counts from now: the overlay may start after the PC went down.
  observe(state: OriginState): void {
    this.progress?.observe(state, Date.now());
  }

  private async probe(): Promise<void> {
    this.observe(await probeOrigin());
  }

  private draw(): void {
    const progress: PowerProgress | null = this.progress;
    if (progress === null) return;
    const now: number = Date.now();
    const percent: number = progress.percent(now);
    const phase: PowerPhase = progress.phase(now);
    this.percent.textContent = `${percent}%`;
    this.fill.style.width = `${percent}%`;
    this.root.setAttribute('aria-valuenow', String(percent));
    this.phase.textContent = PHASES[phase];
    this.close.hidden = phase !== 'stuck';
    if (phase === 'off' || phase === 'back') this.finish();
  }

  private finish(): void {
    this.timers.forEach((timer: number): void => window.clearInterval(timer));
    this.timers = [];
    window.setTimeout((): void => window.location.reload(), RELOAD_DELAY_MS);
  }
}
