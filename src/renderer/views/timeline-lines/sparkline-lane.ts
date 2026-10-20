import type { ChatSnapshot, ClosedChatActivity } from '../../../shared/types';
import { element } from '../../dom';
import { formatClock } from '../../format';
import { chatColor, textOnChatColor } from '../../palette';
import { SESSION_ATTRIBUTE } from '../board-view';
import { renderLaneStatus } from '../timeline-view';
import type { CountStep } from './agent-count-series';
import { runningAgentCount } from './agent-count-series';
import type { SparkFrame } from './sparkline-track';
import { SparklineTrack } from './sparkline-track';

const CLOSED_CLASS: string = 'lane-closed';

// One chat's row in the line view. It lives across polls (keyed by session), so it can glide to a new place
// when the order changes instead of being thrown away and redrawn there.
export class SparklineLane {
  readonly root: HTMLDivElement = element('div', 'lane lane-spark');
  private readonly name: HTMLSpanElement = element('span', 'lane-name');
  private readonly count: HTMLSpanElement = element('span', 'spark-count');
  private status: HTMLElement = element('span', 'lane-status');
  private readonly track: SparklineTrack = new SparklineTrack();

  constructor() {
    const title: HTMLDivElement = element('div', 'spark-title');
    title.append(this.name, this.count);
    const label: HTMLDivElement = element('div', 'lane-label');
    label.append(title, this.status);
    this.root.append(label, this.track.root);
  }

  // Open lanes carry the session, which is what makes a click on them open the chat.
  showOpen(chat: ChatSnapshot, steps: readonly CountStep[], frame: SparkFrame): void {
    this.root.classList.remove(CLOSED_CLASS);
    this.root.dataset[SESSION_ATTRIBUTE] = chat.sessionId;
    this.showIdentity(chat.name, chat.color);
    this.showCount(runningAgentCount(chat.agents));
    this.replaceStatus(renderLaneStatus(chat, frame.now));
    this.track.update(steps, frame);
  }

  // Quieter and not clickable, like in the bar view: there is no live chat behind it to open.
  showClosed(chat: ClosedChatActivity, steps: readonly CountStep[], frame: SparkFrame): void {
    this.root.classList.add(CLOSED_CLASS);
    delete this.root.dataset[SESSION_ATTRIBUTE];
    this.showIdentity(chat.title, chat.color);
    this.showCount(0);
    this.replaceStatus(element('span', 'lane-status', `${chat.repository.name} · last active ${formatClock(chat.lastActivityAt)}`));
    this.track.update(steps, frame);
  }

  private showIdentity(name: string, color: string | null): void {
    this.root.style.setProperty('--chat', chatColor(color));
    this.count.style.color = textOnChatColor(color);
    this.name.textContent = name;
    this.name.title = name;
  }

  private showCount(running: number): void {
    this.count.hidden = running === 0;
    this.count.textContent = String(running);
    this.count.title = running === 1 ? '1 agent running now' : `${running} agents running now`;
  }

  private replaceStatus(next: HTMLElement): void {
    this.status.replaceWith(next);
    this.status = next;
  }
}
