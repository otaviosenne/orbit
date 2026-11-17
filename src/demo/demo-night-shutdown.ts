import type { NightShutdownState, NightWindow } from '../shared/night-shutdown';
import { isStartChoice } from '../shared/night-shutdown';
import type { ActionResult } from '../shared/types';

// The hours the real scripts ship with, so the demo's Computer page looks like the desktop's.
const DEMO_WINDOW: NightWindow = { startHour: 22, endHour: 6 };
const DONE: ActionResult = { ok: true, method: null, error: null };
const REFUSED: ActionResult = { ok: false, method: null, error: 'Not one of tonight\'s hours' };

export class DemoNightShutdown {
  private startHour: number = DEMO_WINDOW.startHour;

  state(): NightShutdownState {
    return { window: DEMO_WINDOW, isEnabled: true, tonightStartHour: this.startHour };
  }

  set(hour: unknown): ActionResult {
    if (!isStartChoice(hour, DEMO_WINDOW)) return REFUSED;
    this.startHour = hour;
    return DONE;
  }
}
