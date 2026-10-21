import type { ChatRadar } from '../../core/chat-radar';
import type { PastChatCatalog } from '../../core/past-chats/past-chat-catalog';
import type { TimelineHistory } from '../../core/timeline-history/timeline-history';
import type { UsageService } from '../../core/usage-service';

// What the routes shared by the desktop window and Orbit Web read from and act through.
export interface RouteServices {
  readonly radar: ChatRadar;
  readonly usage: UsageService;
  readonly pastChats: PastChatCatalog;
  readonly timelineHistory: TimelineHistory;
}
