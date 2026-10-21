import { app } from 'electron';
import { ChatRadar } from '../core/chat-radar';
import { PastChatCatalog } from '../core/past-chats/past-chat-catalog';
import { TimelineHistory } from '../core/timeline-history/timeline-history';
import { UsageService } from '../core/usage-service';
import { pruneOldAttachments } from './attachments';
import { ChatWindows } from './chat-windows';
import { DictationService } from './dictation-service';
import { activeWindowPid, findTerminalWindowPid } from './terminal-window';
import { registerIpcHandlers } from './ipc';
import type { RadarServices } from './ipc';
import { startRemoteAccess } from './remote/start-remote';
import { buildSharedRoutes } from './routes/shared-routes';
import type { SharedRoutes } from './routes/shared-routes';
import { claimSingleInstance } from './single-instance';
import { createRadarWindow } from './window';
import { isDemoMode } from '../demo/demo-mode';
import { startDemo } from '../demo/start-demo';

// Becomes the Wayland app_id that the Hyprland window rule matches.
const APP_ID: string = 'claude-radar';

app.setName(APP_ID);
app.setDesktopName(`${APP_ID}.desktop`);

const dictation: DictationService = new DictationService();

async function start(): Promise<void> {
  if (isDemoMode()) return startDemo();
  if (!(await claimSingleInstance())) return app.quit();
  await app.whenReady();
  const radar: ChatRadar = new ChatRadar({
    activeWindowPid,
    windowPidOf: findTerminalWindowPid,
  });
  const pastChats: PastChatCatalog = new PastChatCatalog();
  const timelineHistory: TimelineHistory = new TimelineHistory(pastChats);
  const services: RadarServices = { radar, usage: new UsageService(), dictation, chatWindows: new ChatWindows(), pastChats, timelineHistory };
  // One table answers the desktop window over IPC and Orbit Web over HTTP.
  const routes: SharedRoutes = buildSharedRoutes(services);
  registerIpcHandlers(services, routes);
  await startRemoteAccess(routes, false);
  createRadarWindow();
  void pruneOldAttachments(Date.now());
}

void start();

app.on('window-all-closed', (): void => app.quit());
app.on('will-quit', (): void => dictation.stop());
