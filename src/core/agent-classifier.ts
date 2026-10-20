import type { AgentState } from '../shared/types';
import { AGENT_QUIET_THRESHOLD_MS } from './config';

export interface AgentActivity {
  readonly finishedFlag: boolean;
  readonly endedCleanly: boolean;
  readonly lastActivityAt: number;
}

// Most meta files never get a `finished` flag, so a clean final turn is the main completion signal.
export function classifyAgent(activity: AgentActivity, now: number): AgentState {
  if (activity.finishedFlag || activity.endedCleanly) return 'done';
  return now - activity.lastActivityAt > AGENT_QUIET_THRESHOLD_MS ? 'quiet' : 'running';
}
