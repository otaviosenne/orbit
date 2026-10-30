import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommandRunner } from '../src/main/computer/command-runner';
import type { Command } from '../src/main/computer/desktop-commands';
import { STATUS_COMMANDS } from '../src/main/computer/desktop-commands';
import { ComputerStatusReader } from '../src/main/computer/computer-status';
import { runComputerAction } from '../src/main/computer/computer-actions';
import { TimedValue } from '../src/main/computer/timed-value';
import { parseAudio, parseBatteries, parseMedia, parseSystemLoad } from '../src/core/computer/status-parsers';

const OUTPUTS: ReadonlyMap<Command, string> = new Map<Command, string>([
  [STATUS_COMMANDS.system, '{"cpu":12,"ram":"20.5","temp":60}'],
  [STATUS_COMMANDS.audio, '{"volume":80,"muted":true,"max":150,"sinks":[{"name":"a","description":"A","active":true}]}'],
  [STATUS_COMMANDS.notificationCount, '3'],
  [STATUS_COMMANDS.doNotDisturb, 'true'],
]);

function fakeRunner(): CommandRunner & { readonly ran: Command[]; readonly launched: Command[] } {
  const ran: Command[] = [];
  const launched: Command[] = [];
  return {
    ran,
    launched,
    output: (command: Command): Promise<string | null> => (ran.push(command), Promise.resolve(OUTPUTS.get(command) ?? (command.file === 'pactl' ? '' : null))),
    launch: (command: Command): void => void launched.push(command),
  };
}

afterEach(() => vi.useRealTimers());

describe('computer status', () => {
  it('reads the status-menu scripts, leaving out what is missing', async () => {
    const status = await new ComputerStatusReader(fakeRunner(), () => Promise.resolve('55\n')).status();
    expect(status.system).toMatchObject({ cpuPercent: 12, ramGb: 20.5, cpuTemperature: 60 });
    expect(status.audio).toMatchObject({ volume: 80, muted: true });
    expect(status.notifications).toEqual({ count: 3, doNotDisturb: true });
    expect(status.brightness).toBe(55);
    expect(status.batteries).toBeNull();
    expect(status.media).toBeNull();
    expect(status.disks).toEqual([]);
  });

  it('reads each source once per interval, however many windows ask', async () => {
    const runner = fakeRunner();
    const reader = new ComputerStatusReader(runner, () => Promise.resolve(null));
    await Promise.all([reader.status(), reader.status()]);
    expect(runner.ran.filter((command) => command === STATUS_COMMANDS.system)).toHaveLength(1);
  });

  it('parses the scripts as they print, strings and empty values included', () => {
    expect(parseSystemLoad('{"cpu":"7","ram":"1.5","temp":""}', 64)).toEqual({ cpuPercent: 7, ramGb: 1.5, ramTotalGb: 64, cpuTemperature: null });
    expect(parseBatteries('{"mouse":"60%","headset":"72","airpods":""}')).toEqual({ mouse: 60, headset: 72, airpods: null });
    expect(parseAudio('not json')).toBeNull();
    expect(parseMedia('Playing\tArtist\tSong')).toEqual({ playing: true, artist: 'Artist', title: 'Song' });
    expect(parseMedia('')).toBeNull();
  });

  it('shares a timed value until it expires or is invalidated', async () => {
    let now = 0;
    let reads = 0;
    const value = new TimedValue(1000, () => Promise.resolve(++reads), () => now);
    await value.get();
    now = 500;
    expect(await value.get()).toBe(1);
    value.invalidate();
    expect(await value.get()).toBe(2);
    now = 2000;
    expect(await value.get()).toBe(3);
  });
});

describe('running a computer action', () => {
  it('answers a power action first and starts it a moment later', async () => {
    vi.useFakeTimers();
    const runner = fakeRunner();
    const reader = new ComputerStatusReader(runner, () => Promise.resolve(null));
    expect((await runComputerAction({ kind: 'power', power: 'suspend' }, reader, runner)).ok).toBe(true);
    expect(runner.launched).toEqual([]);
    vi.runAllTimers();
    expect(runner.launched).toEqual([{ file: 'systemctl', args: ['suspend'] }]);
  });

  it('reports a refused action without running anything', async () => {
    const runner = fakeRunner();
    const reader = new ComputerStatusReader(runner, () => Promise.resolve(null));
    const result = await runComputerAction({ kind: 'output', name: 'gone' }, reader, runner);
    expect(result.ok).toBe(false);
    expect(runner.ran.some((command) => command.file === 'pactl')).toBe(false);
  });
});
