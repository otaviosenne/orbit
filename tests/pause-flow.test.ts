import { describe, expect, it } from 'vitest';
import { pauseEverything } from '../src/renderer/pause/pause-flow';
import type { AskAboutEmulators, EmulatorAnswer } from '../src/renderer/pause/pause-flow';

function setup(open: string[], answer: EmulatorAnswer, failList: boolean = false) {
  const log: string[] = [];
  const asked: string[][] = [];
  return {
    log,
    asked,
    pause: { pauseAll: (): Promise<void> => (log.push('pause'), Promise.resolve()) },
    api: {
      listOpenEmulators: (): Promise<string[]> => (failList ? Promise.reject(new Error('no hyprctl')) : Promise.resolve(open)),
      closeAllEmulators: (): Promise<number> => (log.push('close'), Promise.resolve(open.length)),
    },
    ask: ((labels: readonly string[]): Promise<EmulatorAnswer> => (asked.push([...labels]), Promise.resolve(answer))) as AskAboutEmulators,
  };
}

describe('pauseEverything', () => {
  it('pauses without asking when no emulator is open', async () => {
    const t = setup([], 'close');
    await pauseEverything(t.pause, t.api, t.ask);
    expect(t.asked).toEqual([]);
    expect(t.log).toEqual(['pause']);
  });

  it('pauses the chats first, then closes the emulators when asked to', async () => {
    const t = setup(['Pixel:5554'], 'close');
    await pauseEverything(t.pause, t.api, t.ask);
    expect(t.asked).toEqual([['Pixel:5554']]);
    expect(t.log).toEqual(['pause', 'close']);
  });

  it('only pauses when the emulators are to stay', async () => {
    const t = setup(['Pixel:5554'], 'keep');
    await pauseEverything(t.pause, t.api, t.ask);
    expect(t.log).toEqual(['pause']);
  });

  it('does nothing at all when cancelled', async () => {
    const t = setup(['Pixel:5554'], 'cancel');
    await pauseEverything(t.pause, t.api, t.ask);
    expect(t.log).toEqual([]);
  });

  it('still pauses when the emulators cannot be listed', async () => {
    const t = setup(['Pixel:5554'], 'close', true);
    await pauseEverything(t.pause, t.api, t.ask);
    expect(t.asked).toEqual([]);
    expect(t.log).toEqual(['pause']);
  });
});
