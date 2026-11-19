import type { ClipboardRead, PcClipboard } from '../main/shared-clipboard/pc-clipboard';
import { PNG_MIME_TYPE } from '../main/shared-clipboard/image-format';

// The shared clipboard in the demo and in tests: what the phone sends is what it reads back.
export class MemoryClipboard implements PcClipboard {
  constructor(private content: ClipboardRead = { kind: 'empty' }) {}

  read(): Promise<ClipboardRead> {
    return Promise.resolve(this.content);
  }

  write(text: string): Promise<void> {
    this.content = { kind: 'text', text };
    return Promise.resolve();
  }

  // No ImageMagick here: the bytes are kept as sent, labelled PNG as the desktop would.
  writeImage(image: Buffer): Promise<void> {
    this.content = { kind: 'image', mimeType: PNG_MIME_TYPE, bytes: image };
    return Promise.resolve();
  }

  // Tests put a secret, an image or nothing there, as the desktop could.
  hold(content: ClipboardRead): void {
    this.content = content;
  }
}
