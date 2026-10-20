import type { ChatColor } from '../../shared/chat-colors';
import { CHAT_COLORS } from '../../shared/chat-colors';
import { element } from '../dom';
import { colorHex } from '../palette';

export type ColorPicked = (color: ChatColor) => void;

export class ColorPicker {
  constructor(private readonly root: HTMLElement, onPick: ColorPicked) {
    this.root.replaceChildren(...CHAT_COLORS.map((color: ChatColor) => renderSwatch(color, onPick)));
  }

  toggle(current: string | null): void {
    this.root.hidden = !this.root.hidden;
    for (const swatch of this.root.querySelectorAll<HTMLButtonElement>('.swatch')) {
      swatch.classList.toggle('is-current', swatch.dataset['color'] === current);
    }
  }

  hide(): void {
    this.root.hidden = true;
  }
}

function renderSwatch(color: ChatColor, onPick: ColorPicked): HTMLButtonElement {
  const swatch: HTMLButtonElement = element('button', 'swatch');
  swatch.type = 'button';
  swatch.title = color;
  swatch.dataset['color'] = color;
  swatch.style.setProperty('--swatch', colorHex(color));
  swatch.addEventListener('click', (): void => onPick(color));
  return swatch;
}
