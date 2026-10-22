import { element } from '../dom';
import { chatNumbers } from './chat-numbers';

export const VOICE_NUMBER_CLASS: string = 'voice-number';

// A badge for something a voice command can name; CSS shows it only while voice is active.
export function renderVoiceNumber(label: string, hint: string = ''): HTMLSpanElement {
  const badge: HTMLSpanElement = element('span', VOICE_NUMBER_CLASS, label);
  badge.setAttribute('aria-hidden', 'true');
  if (hint.length > 0) badge.title = hint;
  return badge;
}

// What to say to reach a chat, as the number's tooltip.
function chatHint(number: number): string {
  return `Say “chat ${number}” or “orbit ${number}”`;
}

// "#3" for an open chat, shown beside its repository; null for a chat with no number.
export function renderChatNumber(sessionId: string): HTMLSpanElement | null {
  const number: number | null = chatNumbers.numberOf(sessionId);
  return number === null ? null : renderVoiceNumber(`#${number}`, chatHint(number));
}

// For a badge that outlives the poll (a Panel tile's header): written in place, hidden when the chat has no number.
export function showChatNumber(badge: HTMLElement, sessionId: string): void {
  const number: number | null = chatNumbers.numberOf(sessionId);
  badge.hidden = number === null;
  const text: string = number === null ? '' : `#${number}`;
  if (badge.textContent !== text) badge.textContent = text;
  badge.title = number === null ? '' : chatHint(number);
}

// Numbers a selector's options 1, 2, 3…; options past the last speakable number get none.
const MAX_OPTION_NUMBER: number = 99;
// host: the element of an option that holds the badge, when that is not the option itself.
export function labelOptions(options: readonly HTMLElement[], host: (option: HTMLElement) => HTMLElement = (option: HTMLElement): HTMLElement => option): void {
  options.slice(0, MAX_OPTION_NUMBER).forEach((option: HTMLElement, index: number): void => {
    const slot: HTMLElement = host(option);
    slot.querySelector(`.${VOICE_NUMBER_CLASS}`)?.remove();
    slot.prepend(renderVoiceNumber(String(index + 1), `Say “${index + 1}”`));
  });
}
