import type { TranscriptRecord } from '../transcript-record';
import { recordTime } from '../transcript-record';

const ASSISTANT_MARKER: string = '"type":"assistant"';

// When Claude last wrote in the chat. Only the last few assistant lines are parsed, since they can carry whole files.
export function lastAssistantAt(text: string): number | null {
  const lines: string[] = text.split('\n');
  for (let index: number = lines.length - 1; index >= 0; index -= 1) {
    const line: string = lines[index] ?? '';
    if (!line.includes(ASSISTANT_MARKER)) continue;
    const time: number | null = assistantTime(line);
    if (time !== null) return time;
  }
  return null;
}

function assistantTime(line: string): number | null {
  try {
    const record: TranscriptRecord = JSON.parse(line) as TranscriptRecord;
    return record.type === 'assistant' && record.isSidechain !== true ? recordTime(record) : null;
  } catch {
    return null;
  }
}
