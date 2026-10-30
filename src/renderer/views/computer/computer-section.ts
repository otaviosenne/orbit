import type { ComputerAction, ComputerStatus } from '../../../shared/computer';
import type { ActionResult } from '../../../shared/types';
import { element } from '../../dom';
import { renderAudioGroup } from './audio-group';
import type { ComputerControls } from './computer-controls';
import { renderDevicesGroup } from './devices-group';
import { renderMediaGroup, renderNotificationsGroup } from './notifications-group';
import { renderPowerGroup } from './power-group';
import { renderShortcutsGroup } from './shortcuts-group';
import { renderSystemGroup } from './system-group';

const POLL_MS: number = 3000;
// A risky button stays armed this long for the confirming second tap.
const ARMED_MS: number = 4000;
// After a slider is let go, its own change needs a poll to come back before the page may redraw under the finger.
const HOLD_AFTER_RELEASE_MS: number = 1500;
const LEAD: string = 'This computer from wherever Orbit is open: power, screens, sound, batteries and notifications.';

// Settings' Computer page. Like Resources, it polls only while on screen, and a redraw never lands mid-drag.
export class ComputerSection {
  readonly root: HTMLElement = element('section', 'settings-section computer-section');
  private status: ComputerStatus | null = null;
  private problem: string | null = null;
  private armed: string | null = null;
  private armedTimer: number | null = null;
  private active: boolean = false;
  private timer: number | null = null;
  private refreshing: boolean = false;
  private holding: boolean = false;
  private holdUntil: number = 0;

  constructor() {
    this.render();
    document.addEventListener('visibilitychange', (): void => this.sync());
    this.root.addEventListener('pointerdown', (event: PointerEvent): void => {
      if ((event.target as HTMLElement).closest('input[type="range"], select') !== null) this.holding = true;
    });
    document.addEventListener('pointerup', (): void => this.release());
    document.addEventListener('pointercancel', (): void => this.release());
  }

  // A slider under the finger, or an output picker open: redrawing (here or the whole settings view) would drop it.
  get isHolding(): boolean {
    const focused: Element | null = document.activeElement;
    return this.holding || Date.now() < this.holdUntil || (focused instanceof HTMLSelectElement && this.root.contains(focused));
  }

  setActive(active: boolean): void {
    this.active = active;
    this.sync();
  }

  private sync(): void {
    const shouldPoll: boolean = this.active && document.visibilityState !== 'hidden';
    if (shouldPoll && this.timer === null) {
      void this.refresh();
      this.timer = window.setInterval((): void => void this.refresh(), POLL_MS);
    } else if (!shouldPoll && this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private release(): void {
    if (!this.holding) return;
    this.holding = false;
    this.holdUntil = Date.now() + HOLD_AFTER_RELEASE_MS;
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      this.status = await window.radar.getComputerStatus();
      if (this.problem?.startsWith(LOAD_PROBLEM) === true) this.problem = null;
    } catch (error: unknown) {
      this.problem = `${LOAD_PROBLEM}${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.refreshing = false;
    }
    if (!this.isHolding) this.render();
  }

  private async act(action: ComputerAction): Promise<void> {
    this.disarm();
    const result: ActionResult = await window.radar.runComputerAction(action);
    this.problem = result.ok ? null : `Failed: ${result.error ?? 'unknown error'}`;
    await this.refresh();
    this.render();
  }

  private arm(key: string): void {
    this.armed = key;
    if (this.armedTimer !== null) window.clearTimeout(this.armedTimer);
    this.armedTimer = window.setTimeout((): void => this.disarm(), ARMED_MS);
    this.render();
  }

  private disarm(): void {
    if (this.armedTimer !== null) window.clearTimeout(this.armedTimer);
    this.armedTimer = null;
    if (this.armed === null) return;
    this.armed = null;
    this.render();
  }

  private render(): void {
    const heading: HTMLElement = element('h2', 'settings-heading', 'Computer');
    const lead: HTMLElement = element('p', 'settings-lead', LEAD);
    const parts: HTMLElement[] = this.status === null ? [element('p', 'settings-note', 'Loading…')] : this.parts(this.status);
    if (this.problem !== null) parts.unshift(element('p', 'settings-note is-error', this.problem));
    this.root.replaceChildren(heading, lead, ...parts);
  }

  private parts(status: ComputerStatus): HTMLElement[] {
    const controls: ComputerControls = {
      act: (action: ComputerAction): void => void this.act(action),
      armed: this.armed,
      arm: (key: string): void => this.arm(key),
    };
    return [
      ...renderPowerGroup(controls),
      ...renderSystemGroup(status),
      ...renderAudioGroup(status.audio, status.apps, controls),
      ...renderMediaGroup(status.media, controls),
      ...renderDevicesGroup(status, controls),
      ...renderNotificationsGroup(status.notifications, controls),
      ...renderShortcutsGroup(controls),
    ];
  }
}

const LOAD_PROBLEM: string = 'Could not read the computer: ';
