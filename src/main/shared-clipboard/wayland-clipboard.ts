import type { ClipboardContent } from './clipboard-types';
import { classifyClipboard } from './clipboard-types';
import { MAX_SHARED_TEXT_BYTES } from './clipboard-limits';
import type { ClipboardRead, PcClipboard } from './pc-clipboard';
import type { BoundedRead, WaylandCommands } from './wayland-commands';
import { WL_CLIPBOARD } from './wayland-commands';

const SECRET: ClipboardRead = { kind: 'secret' };
const EMPTY: ClipboardRead = { kind: 'empty' };

// The desktop's own clipboard, through wl-clipboard.
export class WaylandClipboard implements PcClipboard {
  constructor(
    private readonly commands: WaylandCommands = WL_CLIPBOARD,
    private readonly maxBytes: number = MAX_SHARED_TEXT_BYTES,
  ) {}

  async read(): Promise<ClipboardRead> {
    const before: ClipboardContent = classifyClipboard(await this.commands.listTypes());
    if (before.kind !== 'text') return before;
    const read: BoundedRead = await this.commands.readType(before.type, this.maxBytes);
    // A request_typing copy may land between the two calls; the second look keeps it from going out under the
    // first one's all-clear.
    if (classifyClipboard(await this.commands.listTypes()).kind === 'secret') return SECRET;
    if (read.kind === 'too-large') return read;
    // Gone in between, or the copying app quit before serving the paste.
    if (read.kind === 'failed') return EMPTY;
    return { kind: 'text', text: read.bytes.toString('utf8') };
  }

  write(text: string): Promise<void> {
    return this.commands.copy(text);
  }
}
