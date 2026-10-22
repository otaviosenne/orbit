import { element } from '../dom';

const NOTICE_MS: number = 2200;

// A brief red note for a command that found nothing ("No chat #7"), in the corner like the copy toast.
export function showVoiceNotice(message: string): void {
  document.querySelector('.voice-notice')?.remove();
  const notice: HTMLDivElement = element('div', 'voice-notice', message);
  notice.setAttribute('role', 'status');
  document.body.append(notice);
  window.setTimeout((): void => notice.remove(), NOTICE_MS);
}
