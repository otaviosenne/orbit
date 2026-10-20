import type { AgentSnapshot } from '../shared/types';
import { DEMO_EPOCH, SECOND_MS } from './demo-clock';

// Opt-in, so the regular demo stays still enough for repeatable screenshots.
const SURGE_ENV_VAR: string = 'ORBIT_DEMO_SURGE';
const ENABLED_VALUE: string = '1';
// "Changelog 2.4": busy but without agents in the plain demo, so the surge is the only thing its line shows.
const SURGING_SESSION_ID: string = 'b6e1d9a4-3f7c-4b2e-9a6d-4c8f1e5b3a79';
// A few polls per phase, so every change of place in the timeline's line view can be watched.
const PHASE_MS: number = 6 * SECOND_MS;
// Running agents in each phase; going from 1 to 3 and back passes "Checkout redesign" and its 2 agents both ways.
const PHASE_COUNTS: readonly number[] = [0, 1, 3, 1];
const AGENT_DESCRIPTIONS: readonly string[] = ['Collect merged PRs', 'Summarize breaking changes', 'Draft upgrade notes'];

export function isSurgeDemo(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SURGE_ENV_VAR] === ENABLED_VALUE;
}

// The surging chat's agents right now: agent k runs whenever the phase asks for more than k agents.
export function demoSurgeAgents(sessionId: string, now: number, enabled: boolean = isSurgeDemo()): AgentSnapshot[] {
  if (!enabled || sessionId !== SURGING_SESSION_ID) return [];
  const phase: number = Math.floor(Math.max(0, now - DEMO_EPOCH) / PHASE_MS);
  return AGENT_DESCRIPTIONS.flatMap((description: string, slot: number): AgentSnapshot[] => {
    if (countAt(phase) <= slot) return [];
    const startPhase: number = runStart(phase, slot);
    return [runningAgent(`surge-${startPhase}-${slot}`, description, DEMO_EPOCH + startPhase * PHASE_MS, now)];
  });
}

function countAt(phase: number): number {
  return PHASE_COUNTS[phase % PHASE_COUNTS.length] ?? 0;
}

// The first phase of the unbroken run this slot is in, so its agent keeps one id and start time while it runs.
function runStart(phase: number, slot: number): number {
  let start: number = phase;
  while (start > 0 && countAt(start - 1) > slot) start -= 1;
  return start;
}

function runningAgent(id: string, description: string, startedAt: number, now: number): AgentSnapshot {
  return { id, description, agentType: 'general-purpose', state: 'running', startedAt, lastActivityAt: now, endedAt: null };
}
