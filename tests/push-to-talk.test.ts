import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PushToTalk, type PushToTalkHandlers } from '../src/renderer/sheet/push-to-talk';

const SPACE: string = ' ';
// Past the module's hold threshold, so a press this long turns into dictation.
const LONG_HOLD_MS: number = 1000;

interface Recorded {
  readonly taps: boolean[];
  holds: number;
}

// A keyboard event the class can read and cancel, without a DOM.
function key(type: string, value: string): Event {
  const event: Event = new Event(type, { cancelable: true });
  Object.assign(event, { key: value, ctrlKey: false, altKey: false, metaKey: false });
  return event;
}

function setUp(): { input: EventTarget; recorded: Recorded } {
  const input: EventTarget = new EventTarget();
  const recorded: Recorded = { taps: [], holds: 0 };
  const handlers: PushToTalkHandlers = {
    onPress: (): void => undefined,
    onHoldStart: (): void => void recorded.holds++,
    onHoldEnd: (): void => undefined,
    onTap: (_pressedAt: number, byNextKey: boolean): void => void recorded.taps.push(byNextKey),
  };
  new PushToTalk(input as HTMLElement, handlers);
  return { input, recorded };
}

describe('PushToTalk', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout, clearTimeout });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('types the space on release after a plain tap', () => {
    const { input, recorded } = setUp();
    input.dispatchEvent(key('keydown', SPACE));
    input.dispatchEvent(key('keyup', SPACE));
    expect(recorded.taps).toEqual([false]);
  });

  it('types the space as soon as the next key goes down while Space is still held', () => {
    const { input, recorded } = setUp();
    input.dispatchEvent(key('keydown', SPACE));
    input.dispatchEvent(key('keydown', 'u'));
    expect(recorded.taps).toEqual([true]);
    input.dispatchEvent(key('keyup', SPACE));
    vi.advanceTimersByTime(LONG_HOLD_MS);
    expect(recorded.taps).toEqual([true]);
    expect(recorded.holds).toBe(0);
  });

  it('still dictates when Space is held alone', () => {
    const { input, recorded } = setUp();
    input.dispatchEvent(key('keydown', SPACE));
    vi.advanceTimersByTime(LONG_HOLD_MS);
    input.dispatchEvent(key('keyup', SPACE));
    expect(recorded.holds).toBe(1);
    expect(recorded.taps).toEqual([]);
  });

  it('leaves other keys alone when Space is not down', () => {
    const { input, recorded } = setUp();
    input.dispatchEvent(key('keydown', 'u'));
    expect(recorded.taps).toEqual([]);
  });
});
