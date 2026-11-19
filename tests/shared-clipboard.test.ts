import { describe, expect, it } from 'vitest';
import { bearerCredential } from '../src/main/remote/bearer';
import { SECRET_MIME_TYPE } from '../src/main/secret-clipboard/clipboard-commands';
import { classifyClipboard, parseTypeList } from '../src/main/shared-clipboard/clipboard-types';
import type { ClipboardRead } from '../src/main/shared-clipboard/pc-clipboard';
import { MAX_SHARED_TEXT_BYTES } from '../src/main/shared-clipboard/clipboard-limits';
import { parsePhoneContent } from '../src/main/shared-clipboard/phone-content';
import { parsePhoneText } from '../src/main/shared-clipboard/phone-text';
import type { BoundedRead, WaylandCommands } from '../src/main/shared-clipboard/wayland-commands';
import { WaylandClipboard } from '../src/main/shared-clipboard/wayland-clipboard';

const PNG_BYTES: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG_BYTES: Buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]);
const HEIC_BYTES: Buffer = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic', 'latin1'), Buffer.alloc(8)]);
const CONVERTED_PNG: Buffer = Buffer.concat([PNG_BYTES, Buffer.from('converted')]);
const PLAIN_TYPES: readonly string[] = ['text/html', 'text/plain', 'text/plain;charset=utf-8', 'UTF8_STRING'];

// A desktop clipboard in memory: each listTypes call answers the next list in turn, so a test can change the
// clipboard between the check and the read.
function fakeCommands(
  typeLists: readonly (readonly string[])[],
  content: BoundedRead,
): WaylandCommands & { readTypes: string[]; readLimits: number[]; copied: string[]; copiedPngs: Buffer[]; converted: Buffer[] } {
  let call: number = 0;
  const commands = {
    readTypes: [] as string[],
    readLimits: [] as number[],
    copied: [] as string[],
    copiedPngs: [] as Buffer[],
    converted: [] as Buffer[],
    listTypes: async (): Promise<string[]> => [...(typeLists[Math.min(call++, typeLists.length - 1)] ?? [])],
    readType: async (type: string, maxBytes: number): Promise<BoundedRead> => (commands.readTypes.push(type), commands.readLimits.push(maxBytes), content),
    copy: async (text: string): Promise<void> => void commands.copied.push(text),
    copyPng: async (png: Buffer): Promise<void> => void commands.copiedPngs.push(png),
    convertToPng: async (image: Buffer): Promise<Buffer> => (commands.converted.push(image), CONVERTED_PNG),
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

  it('tells an empty clipboard from an image and from something it cannot share', () => {
    expect(classifyClipboard([])).toEqual({ kind: 'empty' });
    expect(classifyClipboard(['image/jpeg', 'image/png'])).toEqual({ kind: 'image', type: 'image/png' });
    expect(classifyClipboard(['x-special/gnome-copied-files'])).toEqual({ kind: 'unsupported' });
  });

  it('takes a copied picture over the HTML a browser offers beside it, but plain text over both', () => {
    expect(classifyClipboard(['text/html', 'image/png'])).toEqual({ kind: 'image', type: 'image/png' });
    expect(classifyClipboard(['image/png', 'text/plain'])).toEqual({ kind: 'text', type: 'text/plain' });
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

  it('reads an image as bytes, under the image limit', async () => {
    const commands = fakeCommands([['image/png']], { kind: 'read', bytes: PNG_BYTES });
    const textLimit: number = 10;
    const imageLimit: number = 20;
    expect(await new WaylandClipboard(commands, textLimit, imageLimit).read()).toEqual({ kind: 'image', mimeType: 'image/png', bytes: PNG_BYTES });
    expect(commands.readLimits).toEqual([imageLimit]);
  });

  it('copies a PNG as is and converts any other image first', async () => {
    const commands = fakeCommands([[]], textOf(''));
    const clipboard: WaylandClipboard = new WaylandClipboard(commands);
    await clipboard.writeImage(PNG_BYTES);
    await clipboard.writeImage(HEIC_BYTES);
    expect(commands.converted).toEqual([HEIC_BYTES]);
    expect(commands.copiedPngs).toEqual([PNG_BYTES, CONVERTED_PNG]);
  });

  it('writes a normal copy', async () => {
    const commands = fakeCommands([[]], textOf(''));
    await new WaylandClipboard(commands).write('from the phone');
    expect(commands.copied).toEqual(['from the phone']);
  });
});

describe('parsePhoneContent', () => {
  it('knows an image by its bytes, whatever type the Shortcut declared', () => {
    for (const bytes of [PNG_BYTES, JPEG_BYTES, HEIC_BYTES]) {
      for (const type of ['image/heic', 'application/octet-stream', undefined]) expect(parsePhoneContent(type, bytes)).toEqual({ kind: 'image', bytes });
    }
  });

  it('refuses a body that claims to be an image but is none', () => {
    expect(parsePhoneContent('image/png', Buffer.from('png'))).toEqual({ kind: 'unsupported' });
  });

  it('reads text as before and refuses text over its own limit', () => {
    expect(parsePhoneContent('application/json', Buffer.from('{"text":"hi ✓"}'))).toEqual({ kind: 'text', text: 'hi ✓' });
    expect(parsePhoneContent('text/plain', Buffer.alloc(MAX_SHARED_TEXT_BYTES + 1, 'x'))).toEqual({ kind: 'too-large' });
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
