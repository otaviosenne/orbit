import { readFile } from 'node:fs/promises';
import { totalmem } from 'node:os';
import type { ComputerStatus, NotificationState } from '../../shared/computer';
import {
  parseAppStreams,
  parseAudio,
  parseBatteries,
  parseBrightness,
  parseDisks,
  parseMedia,
  parseNotificationCount,
  parseSystemLoad,
  parseTemperatures,
  parseTopProcesses,
} from '../../core/computer/status-parsers';
import type { CommandRunner } from './command-runner';
import type { Command } from './desktop-commands';
import { BRIGHTNESS_CACHE, STATUS_COMMANDS } from './desktop-commands';
import { TimedValue } from './timed-value';

// Load, volume and media move by the second; batteries, disks and temperatures barely do, and the process list
// takes a second to sample, so each is read on its own clock.
const LIVE_MS: number = 2000;
const PROCESSES_MS: number = 10_000;
const SLOW_MS: number = 30_000;
// top-processes.sh samples CPU for half a second on top of its own start.
const SCRIPT_TIMEOUT_MS: number = 5000;
const DO_NOT_DISTURB_ON: string = 'true';
// system-stats.sh counts RAM in GiB (free -g style), so the total uses the same unit.
const BYTES_PER_GB: number = 1024 ** 3;

type ReadText = (path: string) => Promise<string | null>;

export type StatusPart = 'audio' | 'apps' | 'brightness' | 'notifications' | 'media';

const readTextFile: ReadText = (path: string): Promise<string | null> => readFile(path, 'utf8').catch((): null => null);

export class ComputerStatusReader {
  private readonly system: TimedValue<string | null>;
  private readonly overview: TimedValue<string | null>;
  private readonly batteries: TimedValue<string | null>;
  private readonly processes: TimedValue<string | null>;
  private readonly parts: Readonly<Record<StatusPart, TimedValue<string | null>>>;
  private readonly doNotDisturb: TimedValue<string | null>;

  constructor(private readonly runner: CommandRunner, readText: ReadText = readTextFile) {
    this.system = this.timed(LIVE_MS, STATUS_COMMANDS.system);
    this.overview = this.timed(SLOW_MS, STATUS_COMMANDS.overview);
    this.batteries = this.timed(SLOW_MS, STATUS_COMMANDS.batteries);
    this.processes = this.timed(PROCESSES_MS, STATUS_COMMANDS.processes);
    this.doNotDisturb = this.timed(LIVE_MS, STATUS_COMMANDS.doNotDisturb);
    this.parts = {
      audio: this.timed(LIVE_MS, STATUS_COMMANDS.audio),
      apps: this.timed(LIVE_MS, STATUS_COMMANDS.apps),
      brightness: new TimedValue(LIVE_MS, (): Promise<string | null> => readText(BRIGHTNESS_CACHE)),
      notifications: this.timed(LIVE_MS, STATUS_COMMANDS.notificationCount),
      media: this.timed(LIVE_MS, STATUS_COMMANDS.media),
    };
  }

  async status(): Promise<ComputerStatus> {
    const [system, overview, batteries, processes, audio, apps, brightness, count, doNotDisturb, media] = await Promise.all([
      this.system.get(),
      this.overview.get(),
      this.batteries.get(),
      this.processes.get(),
      this.parts.audio.get(),
      this.parts.apps.get(),
      this.parts.brightness.get(),
      this.parts.notifications.get(),
      this.doNotDisturb.get(),
      this.parts.media.get(),
    ]);
    return {
      system: system === null ? null : parseSystemLoad(system, totalmem() / BYTES_PER_GB),
      temperatures: overview === null ? null : parseTemperatures(overview),
      disks: overview === null ? [] : parseDisks(overview),
      batteries: batteries === null ? null : parseBatteries(batteries),
      audio: audio === null ? null : parseAudio(audio),
      apps: apps === null ? [] : parseAppStreams(apps),
      brightness: parseBrightness(brightness),
      notifications: notificationState(count, doNotDisturb),
      media: parseMedia(media),
      processes: processes === null ? null : parseTopProcesses(processes),
    };
  }

  // An action just changed these, so the answer to the next look shows the change.
  invalidate(part: StatusPart): void {
    this.parts[part].invalidate();
    if (part === 'notifications') this.doNotDisturb.invalidate();
  }

  private timed(ttlMs: number, command: Command): TimedValue<string | null> {
    return new TimedValue(ttlMs, (): Promise<string | null> => this.runner.output(command, SCRIPT_TIMEOUT_MS));
  }
}

function notificationState(count: string | null, doNotDisturb: string | null): NotificationState | null {
  const total: number | null = parseNotificationCount(count);
  return total === null ? null : { count: total, doNotDisturb: doNotDisturb?.trim() === DO_NOT_DISTURB_ON };
}
