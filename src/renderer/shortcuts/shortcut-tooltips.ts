import { withShortcut } from './shortcut-hint';
import type { ActionShortcutId } from './shortcut-types';

interface HintedControl {
  readonly selector: string;
  readonly label: string;
  readonly shortcut: ActionShortcutId;
}

// Controls whose tooltip names the key that does the same. Only the hub has these shortcuts; a popped-out
// chat window shares the panel's markup but not its keys, so the hints are added here rather than in it.
const HINTED_CONTROLS: readonly HintedControl[] = [
  { selector: '#settings-button', label: 'Settings', shortcut: 'view-settings' },
  { selector: '#action-rename', label: 'Rename', shortcut: 'chat-rename' },
  { selector: '#action-focus', label: "Go to the chat's terminal window", shortcut: 'chat-terminal' },
  { selector: '#action-settings', label: 'Model, effort and skills', shortcut: 'chat-settings' },
  { selector: '#action-window', label: 'Open this chat in its own Orbit window', shortcut: 'chat-window' },
  { selector: '#jump-previous', label: 'Previous message of yours', shortcut: 'chat-previous-message' },
  { selector: '#jump-next', label: 'Next message of yours', shortcut: 'chat-next-message' },
  { selector: '.working-stop', label: 'Interrupt Claude', shortcut: 'chat-interrupt' },
];

const ANY_HINTED: string = HINTED_CONTROLS.map((control: HintedControl) => control.selector).join(', ');

// Sets the title as the pointer arrives, before the shared tooltip reads it; controls built later (the stop
// button appears only while a chat works) are covered too.
export function installShortcutTooltips(): void {
  document.addEventListener('pointerover', (event: PointerEvent): void => {
    const target: Element | null = event.target instanceof Element ? event.target.closest(ANY_HINTED) : null;
    const control: HintedControl | undefined = HINTED_CONTROLS.find((candidate: HintedControl) => target?.matches(candidate.selector) === true);
    if (target !== null && control !== undefined) target.setAttribute('title', withShortcut(control.label, control.shortcut));
  }, true);
}
