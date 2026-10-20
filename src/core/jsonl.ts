import type { TranscriptRecord } from './transcript-record';

export type LineFilter = (line: string) => boolean;

export function parseRecords(text: string, keepLine: LineFilter): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  for (const line of text.split('\n')) {
    if (line.length === 0 || !keepLine(line)) continue;
    const record: TranscriptRecord | null = parseLine(line);
    if (record !== null) records.push(record);
  }
  return records;
}

function parseLine(line: string): TranscriptRecord | null {
  try {
    return JSON.parse(line) as TranscriptRecord;
  } catch {
    return null;
  }
}

// Cheap substring checks keep multi-MB request blobs out of JSON.parse.
export const isConversationLine: LineFilter = (line: string): boolean =>
  line.includes('"type":"user"') || line.includes('"type":"assistant"');

// Conversation records plus the system record that marks how long each turn took.
export const isTranscriptLine: LineFilter = (line: string): boolean =>
  isConversationLine(line) || line.includes('"subtype":"turn_duration"');

export const isColorLine: LineFilter = (line: string): boolean => line.includes('"agent-color"');
