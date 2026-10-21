import type { Route } from '../../shared/ipc-routing';
import type { RemoteChannel } from '../../shared/remote-access';
import { chatSettingsRoutes } from '../chat-settings/chat-settings-routes';
import { actionRoutes } from './action-routes';
import { readRoutes } from './read-routes';
import type { RouteServices } from './route-services';

// One handler per channel Orbit Web may call, used by the desktop window's IPC too, so the two can never drift.
// Typed over every remote channel: marking a channel remote without a handler here fails the type check.
export type SharedRoutes = Readonly<Record<RemoteChannel, Route>>;

export function buildSharedRoutes(services: RouteServices): SharedRoutes {
  return { ...readRoutes(services), ...actionRoutes(services), ...chatSettingsRoutes(services.radar) };
}
