import { homedir } from 'node:os';
import { join } from 'node:path';

const KIB: number = 1024;
const MIB: number = KIB * KIB;
const MINUTE_MS: number = 60_000;

export const CLAUDE_DIR: string = join(homedir(), '.claude');
export const SESSIONS_DIR: string = join(CLAUDE_DIR, 'sessions');
export const PROJECTS_DIR: string = join(CLAUDE_DIR, 'projects');

export const TRANSCRIPT_TAIL_INITIAL_BYTES: number = 512 * KIB;
// Transcripts reach hundreds of MB; past this window the data is too old to matter.
export const TRANSCRIPT_TAIL_MAX_BYTES: number = 16 * MIB;
export const TAIL_GROWTH_FACTOR: number = 4;

// Subagent transcripts are usually around 1 MB; reading them whole finds where each run began.
export const AGENT_READ_BYTES: number = 8 * MIB;

// A subagent inside a long shell command writes nothing for minutes, so silence alone is not "finished".
export const AGENT_QUIET_THRESHOLD_MS: number = 3 * MINUTE_MS;

// Tool calls make transcripts dense; this keeps roughly the last few turns.
export const TRANSCRIPT_ITEM_LIMIT: number = 150;
// The most a renderer may page in at once; far past anything one thread shows, it only bounds a bad request.
export const TRANSCRIPT_PAGE_MAX: number = 10_000;
// Tool inputs and outputs can be whole files; the panel only needs enough to understand what happened.
export const MAX_TOOL_TEXT_CHARS: number = 4000;
