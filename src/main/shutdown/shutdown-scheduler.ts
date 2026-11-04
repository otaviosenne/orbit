import { execFile } from 'node:child_process';
import type { ChatRadar } from '../../core/chat-radar';
import { chatWork, type ChatWork } from '../../shared/chat-work';
import { isMidWork, pauseTargets } from '../../shared/pause-targets';
import type { ShutdownPlan, ShutdownPlanState } from '../../shared/shutdown-plan';
import { parseShutdownPlan } from '../../shared/shutdown-plan';
import type { ActionResult, ChatSnapshot, PauseReport, PauseTarget } from '../../shared/types';
import { continueChats, pauseChats } from '../chat-pause';
import { failure, success } from '../terminal-input';
import { isShutdownDue, nextIdleSince } from './shutdown-decision';
import type { ShutdownPausedChats } from './shutdown-paused-chats';
import type { ShutdownPlanStore } from './shutdown-plan-store';

const CHECK_MS: number = 10_000;
// A safe shutdown gives the chats it paused this long to stop, then powers off whatever they are doing.
const SAFE_WAIT_MS: number = 60_000;
// Even with nothing to wait for, the notice stays up this long, so a mistaken shutdown can still be cancelled.
const MIN_NOTICE_MS: number = 10_000;
const WATCH_MS: number = 2000;
const POWER_OFF: readonly [string, ...string[]] = ['systemctl', 'poweroff'];

interface SafeShutdown {
  readonly endsAt: number;
  readonly earliestAt: number;
  // The chats it paused, which Cancel tells to continue again.
  paused: ChatSnapshot[];
  watch: NodeJS.Timeout | null;
}

export interface ShutdownDependencies {
  readonly radar: ChatRadar;
  readonly store: ShutdownPlanStore;
  readonly pausedChats: ShutdownPausedChats;
}

// Runs planned and safe shutdowns from the main process, so they hold with the Orbit window closed and the phone away.
export class ShutdownScheduler {
  readonly pausedChats: ShutdownPausedChats;
  private plan: ShutdownPlan | null = null;
  private idleSince: number | null = null;
  private workingChats: number = 0;
  private checkTimer: NodeJS.Timeout | null = null;
  private shutting: SafeShutdown | null = null;

  constructor(private readonly dependencies: ShutdownDependencies) {
    this.pausedChats = dependencies.pausedChats;
  }

  async start(): Promise<void> {
    this.adopt(await this.dependencies.store.load());
  }

  async state(): Promise<ShutdownPlanState> {
    await this.check();
    return { plan: this.plan, workingChats: this.workingChats, countdownEndsAt: this.shutting?.endsAt ?? null };
  }

  async set(value: unknown): Promise<ActionResult> {
    if (this.shutting !== null) return failure('The computer is already shutting down; cancel that first');
    const plan: ShutdownPlan | null = parseShutdownPlan(value);
    if (plan === null) return failure('Choose a time, or to wait for the chats, or both');
    if (plan.at !== null && plan.at <= Date.now()) return failure('That time has already passed');
    await this.dependencies.store.save(plan);
    this.adopt(plan);
    return success('socket');
  }

  // Stops a plan, or a safe shutdown in its last minute: the chats it paused are told to carry on.
  async cancel(): Promise<ActionResult> {
    await this.dependencies.store.save(null);
    this.adopt(null);
    await this.abortSafeShutdown();
    return success('socket');
  }

  // Shut down safely, now: what a plan does when it is due.
  async shutDownSafely(): Promise<ActionResult> {
    if (this.shutting !== null) return failure('The computer is already shutting down');
    await this.beginSafeShutdown(Date.now());
    return success('socket');
  }

  private adopt(plan: ShutdownPlan | null): void {
    this.plan = plan;
    this.idleSince = null;
    if (this.checkTimer !== null) clearInterval(this.checkTimer);
    this.checkTimer = plan === null ? null : setInterval((): void => void this.check(), CHECK_MS);
    if (plan !== null) void this.check();
  }

  private async check(): Promise<void> {
    const chats: ChatSnapshot[] = await this.chats();
    this.workingChats = chats.filter(isWorking).length;
    const now: number = Date.now();
    this.idleSince = nextIdleSince(this.idleSince, this.workingChats, now);
    if (this.plan !== null && this.shutting === null && isShutdownDue(this.plan, this.idleSince, now)) await this.beginSafeShutdown(now);
  }

  // Every chat running anything gets the same stop message as Pause all chats; the machine goes down once they have
  // stopped, or after the minute at the latest. Reopened after the reboot, each is told to carry on.
  private async beginSafeShutdown(now: number): Promise<void> {
    const shutting: SafeShutdown = { endsAt: now + SAFE_WAIT_MS, earliestAt: now + MIN_NOTICE_MS, paused: [], watch: null };
    this.shutting = shutting;
    const chats: ChatSnapshot[] = await this.chats();
    const targets: PauseTarget[] = pauseTargets(chats, new Set());
    notify('Shutting down within a minute', targets.length === 0 ? 'Planned in Orbit; cancel it in Settings → Computer.' : `Pausing ${targets.length} chat(s) first. Cancel it in Orbit's Settings → Computer.`);
    const report: PauseReport = await pauseChats(targets);
    if (this.shutting !== shutting) return;
    shutting.paused = chats.filter((chat: ChatSnapshot) => report.reached.includes(chat.pid));
    await this.pausedChats.add(shutting.paused.map((chat: ChatSnapshot) => chat.sessionId), now);
    shutting.watch = setInterval((): void => void this.watch(shutting), WATCH_MS);
  }

  private async watch(shutting: SafeShutdown): Promise<void> {
    if (this.shutting !== shutting) return;
    const now: number = Date.now();
    const live: ChatSnapshot[] = await this.chats();
    const pausedIds: Set<string> = new Set(shutting.paused.map((chat: ChatSnapshot) => chat.sessionId));
    const stillWorking: number = live.filter((chat: ChatSnapshot) => pausedIds.has(chat.sessionId) && isMidWork(chat)).length;
    if (now >= shutting.endsAt || (now >= shutting.earliestAt && stillWorking === 0)) this.powerOff(shutting);
  }

  private async abortSafeShutdown(): Promise<void> {
    const shutting: SafeShutdown | null = this.shutting;
    if (shutting === null) return;
    this.shutting = null;
    if (shutting.watch !== null) clearInterval(shutting.watch);
    const live: ChatSnapshot[] = await this.chats();
    const paused: ChatSnapshot[] = live.filter((chat: ChatSnapshot) => shutting.paused.some((candidate: ChatSnapshot) => candidate.sessionId === chat.sessionId));
    await continueChats(paused.map((chat: ChatSnapshot) => ({ pid: chat.pid, resumesWork: true, emulator: null })));
    await this.pausedChats.remove(shutting.paused.map((chat: ChatSnapshot) => chat.sessionId), Date.now());
  }

  // The plan is forgotten first, so a poweroff that fails does not try again every few seconds.
  private powerOff(shutting: SafeShutdown): void {
    if (shutting.watch !== null) clearInterval(shutting.watch);
    void this.dependencies.store.save(null).then((): void => {
      this.adopt(null);
      execFile(POWER_OFF[0], POWER_OFF.slice(1), (error: Error | null): void => {
        if (error === null) return;
        this.shutting = null;
        notify('Could not shut down', error.message);
      });
    });
  }

  private chats(): Promise<ChatSnapshot[]> {
    return this.dependencies.radar.chats().catch((): ChatSnapshot[] => []);
  }
}

// A turn or an agent: what a plan waits for. A background shell alone is a server, which never finishes.
function isWorking(chat: ChatSnapshot): boolean {
  const work: ChatWork = chatWork(chat);
  return work.isWorking || work.agents > 0;
}

function notify(title: string, body: string): void {
  execFile('notify-send', ['--app-name', 'Orbit', '--urgency', 'critical', title, body], (): void => undefined);
}
