import type { ClipboardContent } from './clipboard-types';
import { classifyClipboard } from './clipboard-types';
import { MAX_SHARED_IMAGE_BYTES, MAX_SHARED_TEXT_BYTES } from './clipboard-limits';
import { isPng } from './image-format';
import type { ClipboardRead, PcClipboard } from './pc-clipboard';
import type { BoundedRead, WaylandCommands } from './wayland-commands';
import { WL_CLIPBOARD } from './wayland-commands';

const SECRET: ClipboardRead = { kind: 'secret' };
const EMPTY: ClipboardRead = { kind: 'empty' };

// The desktop's own clipboard, through wl-clipboard.
export class WaylandClipboard implements PcClipboard {
  constructor(
    private readonly commands: WaylandCommands = WL_CLIPBOARD,
    private readonly maxTextBytes: number = MAX_SHARED_TEXT_BYTES,
    private readonly maxImageBytes: number = MAX_SHARED_IMAGE_BYTES,
  ) {}

  async read(): Promise<ClipboardRead> {
    const before: ClipboardContent = classifyClipboard(await this.commands.listTypes());
    if (before.kind !== 'text' && before.kind !== 'image') return before;
    const read: BoundedRead = await this.commands.readType(before.type, before.kind === 'text' ? this.maxTextBytes : this.maxImageBytes);
    // A request_typing copy may land between the two calls; the second look keeps it from going out under the
    // first one's all-clear.
    if (classifyClipboard(await this.commands.listTypes()).kind === 'secret') return SECRET;
    if (read.kind === 'too-large') return read;
    // Gone in between, or the copying app quit before serving the paste.
    if (read.kind === 'failed') return EMPTY;
    if (before.kind === 'image') return { kind: 'image', mimeType: before.type, bytes: read.bytes };
    return { kind: 'text', text: read.bytes.toString('utf8') };
  }

  write(text: string): Promise<void> {
    return this.commands.copy(text);
  }

  async writeImage(image: Buffer): Promise<void> {
    await this.commands.copyPng(isPng(image) ? image : await this.commands.convertToPng(image));
  }
}
