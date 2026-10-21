const TALK_KEY: string = ' ';

// Space anywhere in the open chat (outside a text field) starts dictation in the composer. Holding it
// still works as push-to-talk: once the composer has focus, the key's repeats and release reach it.
export function listenForSpaceToTalk(isActive: () => boolean, start: () => void): void {
  document.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key !== TALK_KEY || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (!isActive() || isTextField(event.target)) return;
    event.preventDefault();
    start();
  });
}

export function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
}
