import { readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { NightShutdownState, NightWindow } from '../../shared/night-shutdown';
import { holdUntilFor, isStartChoice, tonightStartHour } from '../../shared/night-shutdown';
import type { ActionResult } from '../../shared/types';
import { runCommand } from '../run-command';
import { failure } from '../terminal-input';

const SETTINGS_FILE: string = join(homedir(), '.config/hypr/scripts/auto-shutdown/settings.sh');
const TIMER: string = 'auto-shutdown.timer';
// check.sh skips every night check until the moment this file holds, in epoch seconds.
const HOLD_FILE_NAME: string = 'hold-until';
const MS_PER_SECOND: number = 1000;
// The scripts own their hours and state folder; sourcing their settings keeps one source of truth.
const PRINT_SETTINGS: string = 'source "$1" && echo "$NIGHT_START_HOUR $NIGHT_END_HOUR $STATE_DIR"';
const DONE: ActionResult = { ok: true, method: null, error: null };

interface NightSettings {
  readonly window: NightWindow;
  readonly stateDir: string;
}

const NOT_INSTALLED: NightShutdownState = { window: null, isEnabled: false, tonightStartHour: 0 };

export async function nightShutdownState(now: number = Date.now()): Promise<NightShutdownState> {
  const settings: NightSettings | null = await readSettings();
  if (settings === null) return NOT_INSTALLED;
  const [isEnabled, holdUntil] = await Promise.all([isTimerActive(), readHold(settings.stateDir)]);
  return { window: settings.window, isEnabled, tonightStartHour: tonightStartHour(holdUntil, settings.window, now) };
}

// Moves tonight's start to this hour (the usual one clears the hold); the hold ends by itself in the morning.
export async function setNightShutdownStart(hour: unknown, now: Date = new Date()): Promise<ActionResult> {
  const settings: NightSettings | null = await readSettings();
  if (settings === null) return failure('The night auto-shutdown is not installed');
  if (!isStartChoice(hour, settings.window)) return failure('Not one of tonight\'s hours');
  const holdUntil: number | null = holdUntilFor(hour, settings.window, now);
  const file: string = join(settings.stateDir, HOLD_FILE_NAME);
  try {
    if (holdUntil === null) await rm(file, { force: true });
    else await writeFile(file, `${Math.floor(holdUntil / MS_PER_SECOND)}\n`);
    return DONE;
  } catch (error: unknown) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}

async function readSettings(): Promise<NightSettings | null> {
  try {
    const [start, end, stateDir] = (await runCommand('bash', ['-c', PRINT_SETTINGS, 'night-settings', SETTINGS_FILE])).trim().split(' ');
    const window: NightWindow = { startHour: Number(start), endHour: Number(end) };
    if (!Number.isInteger(window.startHour) || !Number.isInteger(window.endHour) || stateDir === undefined) return null;
    return { window, stateDir };
  } catch {
    return null;
  }
}

async function isTimerActive(): Promise<boolean> {
  try {
    return (await runCommand('systemctl', ['--user', 'is-active', TIMER])).trim() === 'active';
  } catch {
    return false;
  }
}

async function readHold(stateDir: string): Promise<number | null> {
  try {
    const seconds: number = Number((await readFile(join(stateDir, HOLD_FILE_NAME), 'utf8')).trim());
    return Number.isFinite(seconds) ? seconds * MS_PER_SECOND : null;
  } catch {
    return null;
  }
}
