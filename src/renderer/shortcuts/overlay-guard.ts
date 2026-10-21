// Everything that floats over the app and takes the keyboard while open: the card, app and confirm menus
// (all .card-menu), the shell details, Resume, the New chat menu, the image lightbox and Help.
const OPEN_OVERLAYS: readonly string[] = [
  '.card-menu.is-open',
  '.resume-popover:not([hidden])',
  '.new-chat-menu:not([hidden])',
  '#lightbox:not([hidden])',
  '.help-overlay:not([hidden])',
];

const OPEN_OVERLAY_SELECTOR: string = OPEN_OVERLAYS.join(', ');

// Read from the page rather than asked of each component, so a new popover in one of these styles is covered too.
export function isOverlayOpen(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}
