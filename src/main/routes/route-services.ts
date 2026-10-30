import type { ChatWindows } from '../chat-windows';
import type { Computer } from '../computer/computer';
import type { BoardStateStore } from '../board-state/board-state-store';
import type { ChatRadar } from '../../core/chat-radar';
import type { ResourceSampler } from '../../core/resources/resource-sampler';
import type { PastChatCatalog } from '../../core/past-chats/past-chat-catalog';
import type { TimelineHistory } from '../../core/timeline-history/timeline-history';
import type { UsageService } from '../../core/usage-service';

// What the routes shared by the desktop window and Orbit Web read from and act through.
export interface RouteServices {
  readonly radar: ChatRadar;
  readonly usage: UsageService;
  readonly pastChats: PastChatCatalog;
  readonly timelineHistory: TimelineHistory;
  readonly resources: ResourceSampler;
  readonly boardState: BoardStateStore;
  readonly chatWindows: ChatWindows;
  readonly computer: Computer;
}
