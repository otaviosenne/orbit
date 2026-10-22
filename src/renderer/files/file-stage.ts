import { element } from '../dom';
import { isWebHost } from '../host';
import type { PlayableKind } from './file-view';

const CANNOT_PLAY: Readonly<Record<PlayableKind, string>> = {
  video: 'This video cannot play here. Its path is below.',
  audio: 'This audio cannot play here. Its path is below.',
  pdf: 'This PDF cannot be shown here. Its path is below.',
};
const OPEN_IN_TAB_LABEL: string = 'Open in a new tab';
const NEW_TAB_TARGET: string = '_blank';

// The player or document for a file, filled in once its bytes are at hand. A format the browser cannot play
// (mkv with an unknown codec, say) says so instead of showing a dead player.
export function renderPlayer(kind: PlayableKind, url: string): HTMLElement[] {
  switch (kind) {
    case 'video':
      return [mediaPlayer(element('video', 'file-viewer-video'), url, kind)];
    case 'audio':
      return [mediaPlayer(element('audio', 'file-viewer-audio'), url, kind)];
    case 'pdf':
      return pdfFrame(url);
  }
}

export function renderNotice(text: string): HTMLElement {
  return element('p', 'file-viewer-notice', text);
}

export function unavailableNotice(kind: PlayableKind): HTMLElement {
  return renderNotice(CANNOT_PLAY[kind]);
}

function mediaPlayer(media: HTMLMediaElement, url: string, kind: PlayableKind): HTMLElement {
  media.controls = true;
  media.preload = 'metadata';
  media.setAttribute('playsinline', '');
  media.addEventListener('error', (): void => media.replaceWith(unavailableNotice(kind)), { once: true });
  media.src = url;
  return media;
}

// A phone's browser shows a framed PDF poorly (iOS only its first page), so the web also offers its own tab.
function pdfFrame(url: string): HTMLElement[] {
  const frame: HTMLIFrameElement = element('iframe', 'file-viewer-pdf');
  frame.title = 'PDF';
  frame.src = url;
  if (!isWebHost()) return [frame];
  const link: HTMLAnchorElement = element('a', 'file-viewer-link', OPEN_IN_TAB_LABEL);
  link.href = url;
  link.target = NEW_TAB_TARGET;
  link.rel = 'noopener';
  return [frame, link];
}

// A video left playing would go on sounding after the viewer closed.
export function stopPlayers(root: HTMLElement): void {
  for (const media of root.querySelectorAll<HTMLMediaElement>('video, audio')) {
    media.pause();
    media.removeAttribute('src');
    media.load();
  }
}
