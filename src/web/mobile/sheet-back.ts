import { element, requireElement } from '../../renderer/dom';
import { CARET_LEFT_ICON } from '../../renderer/icons';

// On a phone the chat covers the board, so its header leads with a way back. It closes the chat like the desktop's ×
// does; while an agent is open, the chat's own back button (to the chat) shows instead (web.css).
export function installSheetBack(): void {
  const back: HTMLButtonElement = element('button', 'icon-button web-sheet-back');
  back.type = 'button';
  back.innerHTML = CARET_LEFT_ICON;
  back.setAttribute('aria-label', 'Back to the board');
  const close: HTMLElement = requireElement('#sheet-close');
  back.addEventListener('click', (): void => close.click());
  requireElement('.sheet-title-row').prepend(back);
}
