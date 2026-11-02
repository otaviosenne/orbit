import type { ActionResult, ChatSnapshot } from '../../shared/types';
import { RESTART_ICON } from '../icons';
import { suspendStops, suspendWarning } from '../suspend/suspend-stops';
import { showToast } from '../toast';

export type RestartOne = (pid: number) => Promise<ActionResult>;

export interface RestartReport {
  readonly restarted: number;
  // Working, waiting on the user, or running agents or background shells: a restart would cut that short.
  readonly skipped: number;
  readonly failed: number;
}

// Reloads skills, MCP servers, CLAUDE.md and settings in every chat that is resting, one chat at a time so the
// windows do not all come back at once. A chat doing anything is left alone.
export async function restartIdleChats(chats: readonly ChatSnapshot[], restart: RestartOne): Promise<RestartReport> {
  const idle: ChatSnapshot[] = chats.filter(isResting);
  let failed: number = 0;
  for (const chat of idle) {
    const result: ActionResult = await restart(chat.pid).catch((error: unknown): ActionResult => ({ ok: false, method: null, error: String(error) }));
    if (!result.ok) {
      failed++;
      console.error(`Restart of ${chat.sessionId} failed: ${result.error ?? 'unknown'}`);
    }
  }
  return { restarted: idle.length - failed, skipped: chats.length - idle.length, failed };
}

// A chat waiting on a question or a permission prompt would lose it on restart, so only a quiet chat counts.
export function isResting(chat: ChatSnapshot): boolean {
  return chat.status === 'idle' && suspendWarning(suspendStops(chat)) === null;
}

export function showRestartReport(report: RestartReport): void {
  const notes: string[] = [
    ...(report.skipped > 0 ? [`${report.skipped} working or waiting, left alone`] : []),
    ...(report.failed > 0 ? [`${report.failed} could not restart`] : []),
  ];
  showToast({
    title: report.restarted === 0 ? 'No idle chat to restart' : `Restarted ${report.restarted} ${chatsWord(report.restarted)}`,
    icon: RESTART_ICON,
    isProblem: report.restarted === 0 && report.failed > 0,
    ...(notes.length > 0 ? { note: notes.join(' · ') } : {}),
  });
}

function chatsWord(count: number): string {
  return count === 1 ? 'chat' : 'chats';
}
