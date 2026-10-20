import type { ChatSettings } from '../../shared/types';
import { FileMemo } from '../file-memo';
import { isConversationLine, parseRecords } from '../jsonl';
import { searchTail } from '../tail-search';
import type { TailSearchResult } from '../tail-search';
import { chatSettingsFrom, isComplete } from './settings-records';

// Polled every couple of seconds for the open chat, so a transcript is only re-read once it has grown.
export class ChatSettingsReader {
  private readonly memo: FileMemo<ChatSettings> = new FileMemo();

  read(transcriptPath: string): Promise<ChatSettings> {
    return this.memo.get(transcriptPath, (): Promise<ChatSettings> => searchTail(transcriptPath, settingsInTail));
  }
}

function settingsInTail(text: string): TailSearchResult<ChatSettings> {
  const settings: ChatSettings = chatSettingsFrom(parseRecords(text, isConversationLine));
  return { value: settings, satisfied: isComplete(settings) };
}
