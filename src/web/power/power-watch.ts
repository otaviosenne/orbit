import type { ComputerAction } from '../../shared/computer';
import type { ActionResult, RadarApi } from '../../shared/types';
import { isOriginDownStatus, probeOrigin } from './origin-probe';
import type { OriginState, PowerMode } from './power-progress';
import type { PowerOverlay } from './power-overlay';

// Calls fail for a moment on a flaky phone network too, so one failure only asks whether the tunnel is gone.
const PROBE_COOLDOWN_MS: number = 3_000;

// Shows the overlay when the PC goes down: at once when this page sent the command, or as soon as the tunnel
// disappears for any other reason (a safe or planned shutdown, the power button at the desk).
export class PowerWatch {
  private lastProbeAt: number = 0;

  constructor(private readonly overlay: PowerOverlay) {}

  // Orbit's API calls go straight to the tunnel; this sees each answer before the app does.
  watchFetch(fetcher: typeof fetch): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        const response: Response = await fetcher(input, init);
        if (isOriginDownStatus(response.status)) this.suspectDown();
        return response;
      } catch (error: unknown) {
        this.suspectDown();
        throw error;
      }
    };
  }

  // Starts before the answer: a poweroff can cut the connection before it replies.
  watchPower(radar: RadarApi): RadarApi {
    const run: RadarApi['runComputerAction'] = radar.runComputerAction;
    return {
      ...radar,
      runComputerAction: async (action: ComputerAction): Promise<ActionResult> => {
        const mode: PowerMode | null = powerModeOf(action);
        if (mode !== null) this.overlay.start(mode);
        const result: ActionResult = await run(action);
        if (mode !== null && !result.ok) this.overlay.stop();
        return result;
      },
    };
  }

  private suspectDown(): void {
    const now: number = Date.now();
    if (this.overlay.isShowing || now - this.lastProbeAt < PROBE_COOLDOWN_MS) return;
    this.lastProbeAt = now;
    void probeOrigin().then((state: OriginState): void => {
      // Only a missing tunnel means the PC: Orbit alone restarting answers 'starting' for a few seconds.
      if (state !== 'off' || this.overlay.isShowing) return;
      this.overlay.start('shutdown');
      this.overlay.observe(state);
    });
  }
}

function powerModeOf(action: ComputerAction): PowerMode | null {
  if (action.kind !== 'power') return null;
  if (action.power === 'shutdown') return 'shutdown';
  return action.power === 'reboot' ? 'restart' : null;
}
