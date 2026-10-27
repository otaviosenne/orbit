import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DictatedSpan } from '../src/renderer/sheet/hands-free/dictated-span';
import type { SpanBinding } from '../src/renderer/sheet/hands-free/span-writer';
import { SpanWriter } from '../src/renderer/sheet/hands-free/span-writer';
import type { VoiceCommandContext } from '../src/renderer/sheet/voice/commands/command-context';
import { installVoiceCommandContext } from '../src/renderer/sheet/voice/commands/command-context';
import { pausedSendText } from '../src/renderer/sheet/voice/commands/command-parser';
import { SEND_PAUSE_MS } from '../src/renderer/sheet/voice/commands/phrase-table';
import { carryPause } from '../src/renderer/sheet/voice/pause-send';
import { runVoiceCommand } from '../src/renderer/sheet/voice/voice-command-runner';
import type { DraftField } from '../src/renderer/sheet/voice/voice-field';

// Just what the writer and the runner touch on a textarea, with the input events the composer reacts to.
class FakeInput extends EventTarget {
  value: string = '';
  selectionStart: number = 0;
  selectionEnd: number = 0;
  form: { requestSubmit: () => void } | null = null;

  setSelectionRange(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
}

interface Calls {
  views: string[];
  chats: number[];
  picks: number[];
  reports: string[];
  closes: number;
  newChats: number;
  devices: string[];
  suspends: number;
  pins: boolean[];
}

let calls: Calls;
let isSelectorOpen: boolean;

function install(): void {
  const context: VoiceCommandContext = {
    setView: (view: string): number => calls.views.push(view),
    openChat: (number: number): boolean => {
      calls.chats.push(number);
      return number <= 5;
    },
    openDevice: (device: string): number => calls.devices.push(device),
    openNewChat: (): number => calls.newChats++,
    openResume: (): void => undefined,
    suspendChat: (): number => calls.suspends++,
    pinChat: (pinned: boolean): number => calls.pins.push(pinned),
    pick: (number: number): boolean => {
      calls.picks.push(number);
      return number <= 3;
    },
    close: (): number => calls.closes++,
    isSelectorOpen: (): boolean => isSelectorOpen,
    report: (message: string): number => calls.reports.push(message),
  };
  installVoiceCommandContext(context);
}

// A hands-free segment: the span writes the words into the field, and an edit event tells the span the draft is the user's now.
function handsFreeSegment(): { input: FakeInput; say: (text: string, isFinal: boolean) => void } {
  const input: FakeInput = new FakeInput();
  const field: DraftField = { input: input as unknown as HTMLTextAreaElement, draftChanged: (): void => undefined };
  const binding: SpanBinding = { span: new DictatedSpan(), sink: { kind: 'field', field } };
  const writer: SpanWriter = new SpanWriter();
  input.addEventListener('input', (): void => binding.span.rebase());
  return {
    input,
    say: (text: string, isFinal: boolean): void => {
      writer.write(binding, 1, text);
      runVoiceCommand(input as unknown as HTMLTextAreaElement, isFinal);
    },
  };
}

beforeEach(() => {
  calls = { views: [], chats: [], picks: [], reports: [], closes: 0, newChats: 0, devices: [], suspends: 0, pins: [] };
  isSelectorOpen = false;
  install();
});

describe('a spoken command acts once', () => {
  it('switches the view once while live words keep ending in the phrase, and takes it off the draft', () => {
    const { input, say } = handsFreeSegment();
    say('go to the', false);
    say('go to the orbit', false);
    say('go to the orbit board', false);
    expect(calls.views).toEqual(['board']);
    expect(input.value).toBe('go to the');
    say('go to the orbit board', false);
    say('Go to the Orbit board.', true);
    expect(calls.views).toEqual(['board']);
    expect(input.value).toBe('go to the');
  });

  it('opens a chat once, even when the number arrives in the final text too', () => {
    const { input, say } = handsFreeSegment();
    say('chat 3', false);
    say('chat 3', false);
    say('Chat 3.', true);
    expect(calls.chats).toEqual([3]);
    expect(input.value).toBe('');
  });

  it('acts on each command of a long segment once, in order', () => {
    const { say } = handsFreeSegment();
    say('orbit list', false);
    say('orbit list orbit board', false);
    say('orbit list orbit board orbit board', false);
    expect(calls.views).toEqual(['list', 'board', 'board']);
  });

  it('waits for a tens word to be final before choosing a chat, then acts once', () => {
    const { say } = handsFreeSegment();
    say('chat vinte', false);
    expect(calls.chats).toEqual([]);
    say('chat vinte e um', false);
    say('Chat vinte e um.', true);
    expect(calls.chats).toEqual([21]);
  });

  it('runs a push-to-talk final text once', () => {
    const input: FakeInput = new FakeInput();
    input.value = 'fix this orbit new chat';
    runVoiceCommand(input as unknown as HTMLTextAreaElement, true);
    expect(calls.newChats).toBe(1);
    expect(input.value).toBe('fix this');
    runVoiceCommand(input as unknown as HTMLTextAreaElement, true);
    expect(calls.newChats).toBe(1);
  });
});

describe('what a number means', () => {
  it('reports a chat that does not exist', () => {
    const { say } = handsFreeSegment();
    say('chat 7', true);
    expect(calls.reports).toEqual(['No chat #7']);
  });

  it('picks an option while a selector is open, and reports one that does not exist', () => {
    isSelectorOpen = true;
    const { say } = handsFreeSegment();
    say('orbit 2', true);
    expect(calls.picks).toEqual([2]);
    expect(calls.chats).toEqual([]);
    const second = handsFreeSegment();
    second.say('chat 9', true);
    expect(calls.reports).toEqual(['No option #9']);
  });

  it('closes with the cancel word', () => {
    const { say } = handsFreeSegment();
    say('orbit cancelar', true);
    expect(calls.closes).toBe(1);
  });
});

describe('clear', () => {
  it('empties the draft once', () => {
    const { input, say } = handsFreeSegment();
    say('some text I do not want orbit limpar', false);
    expect(input.value).toBe('');
    say('some text I do not want orbit limpar', false);
    expect(input.value).toBe('');
  });
});

describe('send words that wait for a pause', () => {
  const PAUSE_MS: number = SEND_PAUSE_MS;

  // A composer whose form counts how often it is submitted.
  class SendableInput extends FakeInput {
    submits: number = 0;
    override form: { requestSubmit: () => void } = { requestSubmit: (): void => void this.submits++ };
  }

  const asField = (input: SendableInput): HTMLTextAreaElement => input as unknown as HTMLTextAreaElement;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends only after the pause, taking the words off the draft', () => {
    const input: SendableInput = new SendableInput();
    input.value = 'fix the bug, pode enviar';
    runVoiceCommand(asField(input), true);
    vi.advanceTimersByTime(PAUSE_MS - 1);
    expect(input.submits).toBe(0);
    expect(input.value).toBe('fix the bug, pode enviar');
    vi.advanceTimersByTime(1);
    expect(input.submits).toBe(1);
    expect(input.value).toBe('fix the bug');
  });

  it('keeps counting while the same live words repeat', () => {
    const input: SendableInput = new SendableInput();
    input.value = 'fix the bug enviar';
    runVoiceCommand(asField(input), false);
    const elapsed: number = Math.floor(PAUSE_MS * 2 / 3);
    vi.advanceTimersByTime(elapsed);
    runVoiceCommand(asField(input), false);
    vi.advanceTimersByTime(PAUSE_MS - elapsed);
    expect(input.submits).toBe(1);
  });

  it('does not send when more is said after the words', () => {
    const input: SendableInput = new SendableInput();
    input.value = 'quero enviar';
    runVoiceCommand(asField(input), false);
    vi.advanceTimersByTime(PAUSE_MS / 2);
    input.value = 'quero enviar um email para o cliente';
    runVoiceCommand(asField(input), false);
    vi.advanceTimersByTime(PAUSE_MS * 2);
    expect(input.submits).toBe(0);
    expect(input.value).toBe('quero enviar um email para o cliente');
  });

  it('does not send when the user edits the draft during the pause', () => {
    const input: SendableInput = new SendableInput();
    input.value = 'fix the bug pode mandar';
    runVoiceCommand(asField(input), true);
    input.value = 'fix the other bug pode mandar';
    vi.advanceTimersByTime(PAUSE_MS * 2);
    expect(input.submits).toBe(0);
  });

  it('goes on counting after the field is left, and acts when the pause ends', () => {
    const input: SendableInput = new SendableInput();
    input.value = 'fix the bug pode enviar';
    runVoiceCommand(asField(input), true);
    vi.advanceTimersByTime(PAUSE_MS / 2);
    const acted: string[] = [];
    carryPause(asField(input), (): void => void acted.push('sent'));
    input.value = '';
    vi.advanceTimersByTime(PAUSE_MS / 2 - 1);
    expect(acted).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(acted).toEqual(['sent']);
    expect(input.submits).toBe(0);
  });

  it('carries nothing when no send was waiting', () => {
    const input: SendableInput = new SendableInput();
    input.value = 'fix the bug';
    const acted: string[] = [];
    carryPause(asField(input), (): void => void acted.push('sent'));
    vi.advanceTimersByTime(PAUSE_MS * 2);
    expect(acted).toEqual([]);
  });

  it('reads the kept draft without its send words, and nothing from one that no longer ends with them', () => {
    expect(pausedSendText('Fix the bug. Pode enviar.')).toBe('Fix the bug');
    expect(pausedSendText('fix the bug, now also the tests')).toBeNull();
    expect(pausedSendText('fix the bug chinelo')).toBeNull();
  });

  it('still sends right away on the words that need no pause', () => {
    const input: SendableInput = new SendableInput();
    input.value = 'fix the bug chinelo';
    runVoiceCommand(asField(input), true);
    expect(input.submits).toBe(1);
  });
});

describe('suspend and pin by voice', () => {
  const asField = (input: FakeInput): HTMLTextAreaElement => input as unknown as HTMLTextAreaElement;

  it('suspends the chat and takes the phrase off the draft', () => {
    const input: FakeInput = new FakeInput();
    input.value = 'later arbit suspende';
    runVoiceCommand(asField(input), true);
    expect(calls.suspends).toBe(1);
    expect(input.value).toBe('later');
  });

  it('pins and unpins', () => {
    const input: FakeInput = new FakeInput();
    input.value = 'orbit pin';
    runVoiceCommand(asField(input), true);
    input.value = 'orbit desafixar';
    runVoiceCommand(asField(input), true);
    expect(calls.pins).toEqual([true, false]);
  });
});
