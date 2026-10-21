// Where the full-screen chat goes: over the visual viewport while the keyboard is up, otherwise the CSS default.
export interface ViewportBox {
  readonly top: number;
  readonly height: number;
}

export interface VisualViewportLike {
  readonly height: number;
  readonly offsetTop: number;
}

// Only while a text field has focus, which on a phone is exactly while the keyboard is up. iOS 26 can keep
// reporting a shorter, shifted visual viewport after the keyboard closed; following it then would leave the chat
// pushed down with its composer off screen, so with no keyboard the page's own 100dvh box is used instead.
export function chatViewportBox(viewport: VisualViewportLike, isTyping: boolean): ViewportBox | null {
  return isTyping ? { top: viewport.offsetTop, height: viewport.height } : null;
}
