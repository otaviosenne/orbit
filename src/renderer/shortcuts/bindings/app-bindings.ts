import type { ShortcutBindings } from '../shortcut-dispatcher';
import type { BoardShortcutHost } from './board-bindings';
import { boardBindings } from './board-bindings';
import type { ChatShortcutHost } from './chat-bindings';
import { chatBindings } from './chat-bindings';
import type { GeneralShortcutHost } from './general-bindings';
import { generalBindings } from './general-bindings';
import type { TimelineShortcutHost } from './timeline-bindings';
import { timelineBindings } from './timeline-bindings';

// Everything the hub's shortcuts reach into.
export interface AppShortcutHost extends GeneralShortcutHost, BoardShortcutHost, ChatShortcutHost, TimelineShortcutHost {}

// Typed as the full record, so an action added to the registry fails to compile until it is bound here.
export function appShortcutBindings(host: AppShortcutHost): ShortcutBindings {
  return { ...generalBindings(host), ...boardBindings(host), ...chatBindings(host), ...timelineBindings(host) };
}
