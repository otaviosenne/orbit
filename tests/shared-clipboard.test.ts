import { describe, expect, it } from 'vitest';
import { bearerCredential } from '../src/main/remote/bearer';
import { SECRET_MIME_TYPE } from '../src/main/secret-clipboard/clipboard-commands';
import { classifyClipboard, parseTypeList } from '../src/main/shared-clipboard/clipboard-types';
import type { ClipboardRead } from '../src/main/shared-clipboard/pc-clipboard';
import { parsePhoneText } from '../src/main/shared-clipboard/phone-text';
import type { BoundedRead, WaylandCommands } from '../src/main/shared-clipboard/wayland-commands';
import { WaylandClipboard } from '../src/main/shared-clipboard/wayland-clipboard';

const PLAIN_TYPES: readonly string[] = ['text/html', 'text/plain', 'text/plain;charset=utf-8', 'UTF8_STRING'];

// A desktop clipboard in memory: each listTypes call answers the next list in turn, so a test can change the
// clipboard between the check and the read.
function fakeCommands(typeLists: readonly (readonly string[])[], content: BoundedRead): WaylandCommands & { readTypes: string[]; copied: string[] } {
  let call: number = 0;
  const commands = {
    readTypes: [] as string[],
    copied: [] as string[],
    listTypes: async (): Promise<string[]> => [...(typeLists[Math.min(call++, typeLists.length - 1)] ?? [])],
    readType: async (type: string): Promise<BoundedRead> => (commands.readTypes.push(type), content),
    copy: async (text: string): Promise<void> => void commands.copied.push(text),
  };
  return commands;
}

function textOf(text: string): BoundedRead {
  return { kind: 'read', bytes: Buffer.from(text, 'utf8') };
}

describe('classifyClipboard', () => {
  it('prefers UTF-8 plain text among the offered types', () => {
    expect(classifyClipboard(PLAIN_TYPES)).toEqual({ kind: 'text', type: 'text/plain;charset=utf-8' });
    expect(classifyClipboard(['text/uri-list'])).toEqual({ kind: 'text', type: 'text/uri-list' });
  });

  it('treats the Orbit secret marker as a secret whatever else is offered', () => {
    expect(classifyClipboard([...PLAIN_TYPES, SECRET_MIME_TYPE])).toEqual({ kind: 'secret' });
  });

  it('tells an empty clipboard from an image', () => {
    expect(classifyClipboard([])).toEqual({ kind: 'empty' });
    expect(classifyClipboard(['image/png'])).toEqual({ kind: 'not-text' });
  });

  it('reads wl-paste --list-types output line by line', () => {
    expect(parseTypeList('text/plain\nUTF8_STRING\n\n')).toEqual(['text/plain', 'UTF8_STRING']);
  });
});

describe('WaylandClipboard', () => {
  it('reads the preferred text type', async () => {
    const commands = fakeCommands([PLAIN_TYPES], textOf('hello ✓'));
    expect(await new WaylandClipboard(commands).read()).toEqual({ kind: 'text', text: 'hello ✓' });
    expect(commands.readTypes).toEqual(['text/plain;charset=utf-8']);
  });

  it('never reads a secret at all', async () => {
    const commands = fakeCommands([[SECRET_MIME_TYPE]], textOf('hunter2'));
    expect(await new WaylandClipboard(commands).read()).toEqual({ kind: 'secret' });
    expect(commands.readTypes).toEqual([]);
  });

  it('drops what it read when a secret landed in between', async () => {
    const commands = fakeCommands([PLAIN_TYPES, [SECRET_MIME_TYPE]], textOf('hunter2'));
    const read: ClipboardRead = await new WaylandClipboard(commands).read();
    expect(read).toEqual({ kind: 'secret' });
  });

  it('passes on a copy over the limit and a paste that failed', async () => {
    expect(await new WaylandClipboard(fakeCommands([PLAIN_TYPES], { kind: 'too-large' })).read()).toEqual({ kind: 'too-large' });
    expect(await new WaylandClipboard(fakeCommands([PLAIN_TYPES], { kind: 'failed' })).read()).toEqual({ kind: 'empty' });
  });

  it('writes a normal copy', async () => {
    const commands = fakeCommands([[]], textOf(''));
    await new WaylandClipboard(commands).write('from the phone');
    expect(commands.copied).toEqual(['from the phone']);
  });
});

describe('parsePhoneText', () => {
  it('reads plain text, JSON {text} and a form field', () => {
    expect(parsePhoneText('text/plain; charset=utf-8', 'raw')).toEqual({ kind: 'text', text: 'raw' });
    expect(parsePhoneText(undefined, 'raw')).toEqual({ kind: 'text', text: 'raw' });
    expect(parsePhoneText('application/json', '{"text":"json"}')).toEqual({ kind: 'text', text: 'json' });
    expect(parsePhoneText('application/x-www-form-urlencoded', 'text=a%20b')).toEqual({ kind: 'text', text: 'a b' });
  });

  it('refuses a body it cannot read text from', () => {
    expect(parsePhoneText('application/json', '{"text":1}')).toEqual({ kind: 'malformed' });
    expect(parsePhoneText('application/json', 'not json')).toEqual({ kind: 'malformed' });
    expect(parsePhoneText('application/x-www-form-urlencoded', 'other=1')).toEqual({ kind: 'malformed' });
    expect(parsePhoneText('multipart/form-data; boundary=x', '--x')).toEqual({ kind: 'unsupported' });
  });
});

describe('bearerCredential', () => {
  it('takes the credential of a Bearer header only', () => {
    expect(bearerCredential('Bearer abc.def')).toBe('abc.def');
    expect(bearerCredential('bearer  abc.def ')).toBe('abc.def');
    expect(bearerCredential('Basic abc')).toBeNull();
    expect(bearerCredential('Bearer')).toBeNull();
    expect(bearerCredential(undefined)).toBeNull();
  });
});
