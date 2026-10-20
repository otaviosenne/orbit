import type { PermissionMode } from '../../shared/permission-modes';
import { FileMemo } from '../file-memo';
import { parseRecords } from '../jsonl';
import { searchTail } from '../tail-search';
import type { TailSearchResult } from '../tail-search';
import { isPermissionModeLine, permissionModeFrom } from './permission-records';

// The mode last logged in the transcript, for chats whose terminal Orbit cannot read.
export class PermissionRecordReader {
  private readonly memo: FileMemo<PermissionMode | null> = new FileMemo();

  read(transcriptPath: string): Promise<PermissionMode | null> {
    return this.memo.get(transcriptPath, (): Promise<PermissionMode | null> => searchTail(transcriptPath, modeInTail));
  }
}

function modeInTail(text: string): TailSearchResult<PermissionMode | null> {
  const mode: PermissionMode | null = permissionModeFrom(parseRecords(text, isPermissionModeLine));
  return { value: mode, satisfied: mode !== null };
}
