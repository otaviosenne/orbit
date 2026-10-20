import { readFile } from 'node:fs/promises';

// The `.meta.json` Claude Code writes next to each agent's transcript.
export interface AgentMeta {
  readonly agentType?: string;
  readonly description?: string;
  readonly finished?: boolean;
  // Set when the user stopped the agent (its x in Claude Code's background tasks); `finished` never follows.
  readonly stoppedByUser?: boolean;
}

export async function readAgentMeta(metaPath: string): Promise<AgentMeta> {
  try {
    return JSON.parse(await readFile(metaPath, 'utf8')) as AgentMeta;
  } catch {
    return {};
  }
}

// A stopped agent's transcript ends on an interruption, not a clean turn, so only its meta says it is over.
export function isAgentOver(meta: AgentMeta): boolean {
  return meta.finished === true || meta.stoppedByUser === true;
}
