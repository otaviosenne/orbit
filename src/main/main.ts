import { join } from 'node:path';
import { app } from 'electron';
import { ChatRadar } from '../core/chat-radar';
import { PastChatCatalog } from '../core/past-chats/past-chat-catalog';
import { ResourceSampler } from '../core/resources/resource-sampler';
import { TimelineHistory } from '../core/timeline-history/timeline-history';
import { UsageService } from '../core/usage-service';
import { pruneOldAttachments } from './attachments';
import { BoardStateStore } from './board-state/board-state-store';
import { ChatWindows } from './chat-windows';
import { DictationService } from './dictation-service';
import type { DictationEngine } from './remote/dictation/dictation-engine';
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
const BOARD_STATE_FILE: string = 'board-state.json';

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
  const boardState: BoardStateStore = new BoardStateStore(join(app.getPath('userData'), BOARD_STATE_FILE));
  const services: RadarServices = { radar, usage: new UsageService(), dictation, chatWindows: new ChatWindows(), pastChats, timelineHistory, resources: new ResourceSampler(), boardState };
  // One table answers the desktop window over IPC and Orbit Web over HTTP.
  const routes: SharedRoutes = buildSharedRoutes(services);
  registerIpcHandlers(services, routes);
  // Each Orbit Web browser gets its own service, so its dictation never touches the desktop window's or another's.
  await startRemoteAccess(routes, (): DictationEngine => new DictationService(), false);
  createRadarWindow();
  void pruneOldAttachments(Date.now());
}

void start();

app.on('window-all-closed', (): void => app.quit());
app.on('will-quit', (): void => dictation.stop());
