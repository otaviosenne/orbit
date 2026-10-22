import { beforeEach, describe, expect, it } from 'vitest';
import { DictatedSpan } from '../src/renderer/sheet/hands-free/dictated-span';
import type { SpanBinding } from '../src/renderer/sheet/hands-free/span-writer';
import { SpanWriter } from '../src/renderer/sheet/hands-free/span-writer';
import type { VoiceCommandContext } from '../src/renderer/sheet/voice/commands/command-context';
import { installVoiceCommandContext } from '../src/renderer/sheet/voice/commands/command-context';
import { runVoiceCommand } from '../src/renderer/sheet/voice/voice-command-runner';
import type { DraftField } from '../src/renderer/sheet/voice/voice-field';

// Just what the writer and the runner touch on a textarea, with the input events the composer reacts to.
class FakeInput extends EventTarget {
  value: string = '';
  selectionStart: number = 0;
  selectionEnd: number = 0;
  form: null = null;

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
  calls = { views: [], chats: [], picks: [], reports: [], closes: 0, newChats: 0, devices: [] };
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
