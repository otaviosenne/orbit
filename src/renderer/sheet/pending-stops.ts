import type { AgentSnapshot } from '../../shared/types';

// A stopped agent is listed as finished within a poll or two; one still writing after this long was not stopped.
export const STOP_GRACE_MS: number = 15_000;

// Agents whose stop was asked for, hidden from the strip at once instead of after the chat confirms it.
export class PendingStops {
  private readonly requestedAt: Map<string, number> = new Map();

  hide(agentId: string, now: number): void {
    this.requestedAt.set(agentId, now);
  }

  // The stop failed: the row comes back.
  restore(agentId: string): void {
    this.requestedAt.delete(agentId);
  }

  // Finished agents never reach the strip, so whatever is still listed past the grace period and wrote since keeps running.
  visible(agents: readonly AgentSnapshot[], now: number): AgentSnapshot[] {
    return agents.filter((agent: AgentSnapshot): boolean => {
      const since: number | undefined = this.requestedAt.get(agent.id);
      if (since === undefined) return true;
      if (now - since < STOP_GRACE_MS || agent.lastActivityAt <= since) return false;
      this.requestedAt.delete(agent.id);
      return true;
    });
  }
}
