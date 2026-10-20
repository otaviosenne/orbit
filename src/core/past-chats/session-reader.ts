import { readHead, readTail } from '../file-reader';
import type { TailText } from '../file-reader';
import { parseRecords } from '../jsonl';
import type { SessionMetaRecord, SessionSummary } from './session-summary';
import { isSessionMetaLine, summarizeSession } from './session-summary';

const KIB: number = 1024;
// Titles are rewritten every few dozen KB and the first prompt sits at the top, so both ends of a transcript are enough.
const END_BYTES: number = 64 * KIB;

// Reads only the start and the end of a transcript, which can be hundreds of MB.
export async function readSessionSummary(path: string): Promise<SessionSummary> {
  const tail: TailText = await readTail(path, END_BYTES);
  if (tail.reachedStart) return summarizeSession(parse(tail.text), []);
  return summarizeSession(parse(await readHead(path, END_BYTES)), parse(tail.text));
}

function parse(text: string): SessionMetaRecord[] {
  return parseRecords(text, isSessionMetaLine) as SessionMetaRecord[];
}
