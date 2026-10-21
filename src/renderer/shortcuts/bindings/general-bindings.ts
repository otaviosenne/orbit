import type { ViewName } from '../../nav';
import type { ShortcutBindings } from '../shortcut-dispatcher';
import { always } from './binding';

export interface GeneralShortcutHost {
  readonly setView: (view: ViewName) => void;
  readonly newChat: { openLast(): void; toggleMenu(): Promise<void> };
  readonly resume: { toggle(): void };
  readonly help: { toggle(): void };
}

type GeneralShortcutId = 'view-board' | 'view-panel' | 'view-timeline' | 'view-settings' | 'new-chat' | 'new-chat-menu' | 'resume' | 'help';

export function generalBindings(host: GeneralShortcutHost): Pick<ShortcutBindings, GeneralShortcutId> {
  return {
    'view-board': always((): void => host.setView('board')),
    'view-panel': always((): void => host.setView('grid')),
    'view-timeline': always((): void => host.setView('timeline')),
    'view-settings': always((): void => host.setView('settings')),
    'new-chat': always((): void => host.newChat.openLast()),
    'new-chat-menu': always((): void => void host.newChat.toggleMenu()),
    resume: always((): void => host.resume.toggle()),
    help: always((): void => host.help.toggle()),
  };
}
