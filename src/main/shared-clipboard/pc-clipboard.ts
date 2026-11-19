// What the PC clipboard holds, as far as the phone may know. A secret, a file list or a huge paste never leaves the PC.
export type ClipboardRead =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image'; readonly mimeType: string; readonly bytes: Buffer }
  | { readonly kind: 'secret' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'too-large' };

// The PC clipboard as the iPhone's Shortcuts see it: the desktop's Wayland one, or an in-memory one in tests and the demo.
export interface PcClipboard {
  read(): Promise<ClipboardRead>;
  // A normal copy, so it lands in cliphist like any other.
  write(text: string): Promise<void>;
  // Lands as image/png whatever format the phone sent, since that is the one every Linux app pastes.
  writeImage(image: Buffer): Promise<void>;
}
