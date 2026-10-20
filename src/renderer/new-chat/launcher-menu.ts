import type { LauncherEntry } from '../../shared/types';
import { element } from '../dom';
import { CHECK_ICON, PLUS_ICON } from '../icons';

export interface LauncherMenuActions {
  readonly open: (name: string) => void;
  readonly addShortcut: () => void;
}

// The rows under New chat's caret: every project, the last one used checked, then "Add Shortcut…".
export function renderLauncherMenu(entries: readonly LauncherEntry[], last: string | null, actions: LauncherMenuActions): HTMLElement[] {
  const rows: HTMLElement[] = entries.map((entry: LauncherEntry) => renderItem(entry, entry.name === last, actions));
  return [...rows, element('div', 'new-chat-separator'), renderAddItem(actions)];
}

function renderItem(entry: LauncherEntry, isLast: boolean, actions: LauncherMenuActions): HTMLButtonElement {
  const item: HTMLButtonElement = element('button', `new-chat-item${isLast ? ' is-last' : ''}`);
  item.type = 'button';
  item.title = `Opens a chat named “${entry.chatName}”${entry.folder === null ? '' : ` in ${entry.folder}`}`;
  const mark: HTMLSpanElement = element('span', 'new-chat-check');
  if (isLast) mark.innerHTML = CHECK_ICON;
  // A shortcut's command is an internal id, so its folder says more about where the chat opens.
  item.append(mark, element('span', 'new-chat-name', entry.name), element('span', 'new-chat-command', entry.folder ?? entry.command));
  item.addEventListener('click', (): void => actions.open(entry.name));
  return item;
}

function renderAddItem(actions: LauncherMenuActions): HTMLButtonElement {
  const item: HTMLButtonElement = element('button', 'new-chat-item new-chat-add');
  item.type = 'button';
  const mark: HTMLSpanElement = element('span', 'new-chat-check');
  mark.innerHTML = PLUS_ICON;
  item.append(mark, element('span', 'new-chat-name', 'Add Shortcut…'));
  item.addEventListener('click', (): void => actions.addShortcut());
  return item;
}
